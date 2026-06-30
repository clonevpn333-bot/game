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
  const grad3 = (h, x, y, z) => { const u = (h & 1) ? x : -x; const v = (h & 2) ? y : -y; const w = (h & 4) ? z : -z; return u + v + w; };
  function noise2(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const aa = p[p[X] + Y], ab = p[p[X] + Y + 1], ba = p[p[X + 1] + Y], bb = p[p[X + 1] + Y + 1];
    return lerp(lerp(grad(aa, x, y), grad(ba, x - 1, y), u), lerp(grad(ab, x, y - 1), grad(bb, x - 1, y - 1), u), v);
  }
  function noise3(x, y, z) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z, Bp = p[X + 1] + Y, BA = p[Bp] + Z, BB = p[Bp + 1] + Z;
    return lerp(
      lerp(lerp(grad3(p[AA], x, y, z), grad3(p[BA], x - 1, y, z), u), lerp(grad3(p[AB], x, y - 1, z), grad3(p[BB], x - 1, y - 1, z), u), v),
      lerp(lerp(grad3(p[AA + 1], x, y, z - 1), grad3(p[BA + 1], x - 1, y, z - 1), u), lerp(grad3(p[AB + 1], x, y - 1, z - 1), grad3(p[BB + 1], x - 1, y - 1, z - 1), u), v),
      w);
  }
  return {
    n2: noise2, n3: noise3,
    fbm(x, y, oct = 4, lac = 2, gain = 0.5) {
      let s = 0, amp = 1, f = 1, norm = 0;
      for (let o = 0; o < oct; o++) { s += amp * noise2(x * f, y * f); norm += amp; amp *= gain; f *= lac; }
      return s / norm;
    },
    fbm3(x, y, z, oct = 3, lac = 2, gain = 0.5) {
      let s = 0, amp = 1, f = 1, norm = 0;
      for (let o = 0; o < oct; o++) { s += amp * noise3(x * f, y * f, z * f); norm += amp; amp *= gain; f *= lac; }
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
  RED_SAND: 31, TERRACOTTA: 32, CLAY: 33, NETHERRACK: 34, NETHER_BRICK: 35,
  END_STONE: 36, QUARTZ: 37, IRON_BLOCK: 38, GOLD_BLOCK: 39, DIAMOND_BLOCK: 40,
  EMERALD_ORE: 41, EMERALD_BLOCK: 42, REDSTONE_ORE: 43, REDSTONE_BLOCK: 44,
  BEDROCK: 45, CRAFTING_TABLE: 46, FURNACE: 47,
  ASPHALT: 48, CONCRETE: 49, ROADLINE: 50, WINDOW: 51,
  STUCCO_TEAL: 52, STUCCO_PINK: 53, STUCCO_CREAM: 54, STUCCO_CORAL: 55, PALM_LEAVES: 56, NEON: 57,
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
  [B.LEAVES]: def({ name: 'Oak Leaves', all: 'leaves', tint: 'foliage', opaque: false, render: 'leaves' }),
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
  [B.SPRUCE_LEAVES]: def({ name: 'Spruce Leaves', all: 'spruce_leaves', tint: 'foliage', opaque: false, render: 'leaves' }),
  [B.CACTUS]: def({ name: 'Cactus', top: 'cactus_top', side: 'cactus_side', bottom: 'cactus_top', opaque: false }),
  [B.MOSSY]: def({ name: 'Mossy Cobblestone', all: 'mossy' }),
  [B.WOOL]: def({ name: 'White Wool', all: 'wool' }),
  [B.ICE]: def({ name: 'Ice', all: 'ice', opaque: false, render: 'glass' }),
  [B.RED_SAND]: def({ name: 'Red Sand', all: 'red_sand' }),
  [B.TERRACOTTA]: def({ name: 'Terracotta', all: 'terracotta' }),
  [B.CLAY]: def({ name: 'Clay', all: 'clay' }),
  [B.NETHERRACK]: def({ name: 'Netherrack', all: 'netherrack' }),
  [B.NETHER_BRICK]: def({ name: 'Nether Bricks', all: 'nether_brick' }),
  [B.END_STONE]: def({ name: 'End Stone', all: 'end_stone' }),
  [B.QUARTZ]: def({ name: 'Block of Quartz', top: 'quartz_top', side: 'quartz_side', bottom: 'quartz_top' }),
  [B.IRON_BLOCK]: def({ name: 'Block of Iron', all: 'iron_block' }),
  [B.GOLD_BLOCK]: def({ name: 'Block of Gold', all: 'gold_block' }),
  [B.DIAMOND_BLOCK]: def({ name: 'Block of Diamond', all: 'diamond_block' }),
  [B.EMERALD_ORE]: def({ name: 'Emerald Ore', all: 'emerald_ore' }),
  [B.EMERALD_BLOCK]: def({ name: 'Block of Emerald', all: 'emerald_block' }),
  [B.REDSTONE_ORE]: def({ name: 'Redstone Ore', all: 'redstone_ore', light: 7 }),
  [B.REDSTONE_BLOCK]: def({ name: 'Block of Redstone', all: 'redstone_block' }),
  [B.BEDROCK]: def({ name: 'Bedrock', all: 'bedrock' }),
  [B.CRAFTING_TABLE]: def({ name: 'Crafting Table', top: 'crafting_top', side: 'crafting_side', bottom: 'planks' }),
  [B.FURNACE]: def({ name: 'Furnace', top: 'furnace_top', side: 'furnace_front', bottom: 'furnace_top' }),
  [B.ASPHALT]: def({ name: 'Asphalt', all: 'asphalt' }),
  [B.CONCRETE]: def({ name: 'Concrete', all: 'concrete' }),
  [B.ROADLINE]: def({ name: 'Road Marking', all: 'roadline' }),
  [B.WINDOW]: def({ name: 'Window', all: 'window', opaque: false, render: 'glass' }),
  [B.STUCCO_TEAL]: def({ name: 'Teal Stucco', all: 'stucco_teal' }),
  [B.STUCCO_PINK]: def({ name: 'Pink Stucco', all: 'stucco_pink' }),
  [B.STUCCO_CREAM]: def({ name: 'Cream Stucco', all: 'stucco_cream' }),
  [B.STUCCO_CORAL]: def({ name: 'Coral Stucco', all: 'stucco_coral' }),
  [B.PALM_LEAVES]: def({ name: 'Palm Fronds', all: 'palm_leaves', tint: 'foliage', opaque: false, render: 'leaves' }),
  [B.NEON]: def({ name: 'Neon Sign', all: 'neon', light: 14 }),
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
const ALL_PLACEABLE = [B.GRASS, B.DIRT, B.STONE, B.COBBLE, B.MOSSY, B.SAND, B.RED_SAND, B.SANDSTONE, B.GRAVEL, B.CLAY, B.TERRACOTTA, B.PLANKS, B.LOG, B.SPRUCE_LOG, B.LEAVES, B.SPRUCE_LEAVES, B.GLASS, B.BRICK, B.BOOKSHELF, B.CRAFTING_TABLE, B.FURNACE, B.WOOL, B.SNOW, B.ICE, B.OBSIDIAN, B.GLOWSTONE, B.NETHERRACK, B.NETHER_BRICK, B.END_STONE, B.QUARTZ, B.ASPHALT, B.CONCRETE, B.WINDOW, B.STUCCO_TEAL, B.STUCCO_PINK, B.STUCCO_CREAM, B.STUCCO_CORAL, B.NEON, B.BEDROCK, B.COAL, B.IRON, B.GOLD, B.DIAMOND, B.EMERALD_ORE, B.REDSTONE_ORE, B.IRON_BLOCK, B.GOLD_BLOCK, B.DIAMOND_BLOCK, B.EMERALD_BLOCK, B.REDSTONE_BLOCK, B.PUMPKIN, B.CACTUS, B.WATER, B.POPPY, B.TALLGRASS];

// ---------------------------------------------------------------------------
// Texture atlas (clean, low-noise pixel art)
// ---------------------------------------------------------------------------
const TILE = 16, COLS = 8;
function buildAtlas() {
  const names = ['grass_top', 'grass_side', 'dirt', 'stone', 'cobble', 'sand', 'sandstone_top', 'sandstone',
    'water', 'log_top', 'log_side', 'spruce_side', 'leaves', 'spruce_leaves', 'planks', 'glass', 'snow',
    'gravel', 'coal_ore', 'iron_ore', 'gold_ore', 'diamond_ore', 'brick', 'bookshelf', 'pumpkin_top',
    'pumpkin_side', 'glowstone', 'obsidian', 'poppy', 'tallgrass', 'cactus_top', 'cactus_side', 'mossy', 'wool', 'ice',
    'red_sand', 'terracotta', 'clay', 'netherrack', 'nether_brick', 'end_stone', 'quartz_top', 'quartz_side',
    'iron_block', 'gold_block', 'diamond_block', 'emerald_ore', 'emerald_block', 'redstone_ore', 'redstone_block',
    'bedrock', 'crafting_top', 'crafting_side', 'furnace_top', 'furnace_front',
    'asphalt', 'concrete', 'roadline', 'window',
    'stucco_teal', 'stucco_pink', 'stucco_cream', 'stucco_coral', 'palm_leaves', 'neon'];
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
    case 'red_sand': fillN(190, 110, 58, 7); break;
    case 'terracotta': { fillN(150, 92, 66, 6); rect(0, 0, TILE, 1, 130, 78, 56); rect(0, 8, TILE, 1, 134, 80, 58); break; }
    case 'clay': fillN(160, 164, 172, 5); break;
    case 'netherrack': { const c = [110, 38, 38]; fillN(...c, 9); for (let i = 0; i < 16; i++) { const v = (rng() - 0.5) * 36; set(rng() * TILE | 0, rng() * TILE | 0, c[0] + v, c[1] + v * 0.3, c[2] + v * 0.3); } break; }
    case 'nether_brick': { const m = [42, 20, 24]; rect(0, 0, TILE, TILE, m[0], m[1], m[2]); for (let row = 0; row < 4; row++) { const off = (row % 2) * 4; for (let col = -1; col < 4; col++) { const x = col * 8 + off + 1, y = row * 4 + 1; const v = (rng() - 0.5) * 8; rect(x, y, 6, 3, 64 + v, 32 + v, 38 + v); } } break; }
    case 'end_stone': { fillN(220, 224, 170, 6); for (let i = 0; i < 10; i++) set(rng() * TILE | 0, rng() * TILE | 0, 198, 200, 150); break; }
    case 'quartz_top': fillN(236, 232, 224, 4); break;
    case 'quartz_side': { fillN(232, 228, 220, 4); rect(0, 0, TILE, 1, 214, 210, 202); rect(0, 15, TILE, 1, 214, 210, 202); break; }
    case 'iron_block': { fillN(216, 216, 220, 4); rect(2, 2, 12, 12, 232, 232, 236); rect(3, 3, 10, 1, 250, 250, 252); break; }
    case 'gold_block': { fillN(238, 200, 70, 5); rect(2, 2, 12, 12, 248, 214, 90); rect(3, 3, 10, 1, 255, 240, 150); break; }
    case 'diamond_block': { fillN(120, 224, 218, 5); rect(2, 2, 12, 12, 150, 236, 230, 255); rect(3, 3, 3, 3, 220, 255, 252); rect(10, 9, 3, 3, 200, 250, 248); break; }
    case 'emerald_ore': paintOre(set, rng, [40, 200, 90]); break;
    case 'emerald_block': { fillN(40, 190, 96, 5); rect(2, 2, 12, 12, 56, 210, 112); rect(3, 3, 3, 3, 120, 240, 160); break; }
    case 'redstone_ore': paintOre(set, rng, [210, 36, 36]); break;
    case 'redstone_block': { fillN(170, 26, 26, 7); for (let i = 0; i < 12; i++) set(rng() * TILE | 0, rng() * TILE | 0, 220, 50, 50); break; }
    case 'bedrock': { fillN(70, 70, 74, 10); for (let i = 0; i < 18; i++) { const v = rng() < 0.5 ? -40 : 40; set(rng() * TILE | 0, rng() * TILE | 0, 70 + v, 70 + v, 74 + v); } break; }
    case 'crafting_top': { const c = [165, 130, 82]; fillN(...c, 4); rect(0, 0, TILE, TILE, 0, 0, 0, 0); fillN(...c, 4); for (let i = 1; i < TILE; i += 2) { rect(i, 0, 1, TILE, 120, 92, 56); } for (let i = 1; i < TILE; i += 2) rect(0, i, TILE, 1, 120, 92, 56); rect(2, 2, 5, 5, 92, 70, 44); rect(9, 2, 5, 5, 92, 70, 44); rect(2, 9, 5, 5, 92, 70, 44); rect(9, 9, 5, 5, 92, 70, 44); break; }
    case 'crafting_side': { const c = [150, 116, 72]; fillN(...c, 5); for (let y = 0; y < TILE; y += 4) rect(0, y, TILE, 1, c[0] - 30, c[1] - 30, c[2] - 30); rect(2, 2, 5, 5, 92, 70, 44); rect(9, 9, 5, 4, 92, 70, 44); rect(3, 10, 3, 3, 110, 84, 52); break; }
    case 'furnace_top': { fillN(96, 96, 100, 5); rect(4, 4, 8, 8, 70, 70, 74); break; }
    case 'furnace_front': { fillN(104, 104, 108, 5); rect(3, 6, 10, 8, 40, 40, 44); rect(4, 7, 8, 4, 70, 44, 20); rect(5, 8, 6, 2, 240, 150, 40); rect(4, 2, 8, 2, 80, 80, 84); break; }
    case 'asphalt': { fillN(46, 47, 52, 5); for (let i = 0; i < 14; i++) set(rng() * TILE | 0, rng() * TILE | 0, 70, 71, 76); break; }
    case 'concrete': { fillN(166, 168, 172, 4); rect(0, 0, TILE, 1, 150, 152, 156); rect(0, 15, TILE, 1, 150, 152, 156); break; }
    case 'roadline': { fillN(46, 47, 52, 4); rect(6, 0, 4, TILE, 226, 200, 70); break; }
    case 'window': { for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) set(x, y, 150, 196, 226, 150); rect(0, 0, TILE, 1, 90, 96, 104, 255); rect(0, 7, TILE, 1, 90, 96, 104, 255); rect(0, 0, 1, TILE, 90, 96, 104, 255); rect(7, 0, 1, TILE, 90, 96, 104, 255); rect(15, 0, 1, TILE, 90, 96, 104, 255); for (let i = 0; i < 4; i++) set(2 + i, 2 + i, 230, 245, 252, 220); break; }
    case 'stucco_teal': { const c = [120, 198, 190]; fillN(...c, 3); rect(0, 0, TILE, 1, c[0] - 24, c[1] - 24, c[2] - 24); rect(0, TILE - 1, TILE, 1, c[0] - 24, c[1] - 24, c[2] - 24); break; }
    case 'stucco_pink': { const c = [240, 178, 196]; fillN(...c, 3); rect(0, 0, TILE, 1, c[0] - 24, c[1] - 24, c[2] - 24); rect(0, TILE - 1, TILE, 1, c[0] - 24, c[1] - 24, c[2] - 24); break; }
    case 'stucco_cream': { const c = [244, 234, 200]; fillN(...c, 3); rect(0, 0, TILE, 1, c[0] - 22, c[1] - 22, c[2] - 22); rect(0, TILE - 1, TILE, 1, c[0] - 22, c[1] - 22, c[2] - 22); break; }
    case 'stucco_coral': { const c = [240, 150, 120]; fillN(...c, 3); rect(0, 0, TILE, 1, c[0] - 24, c[1] - 24, c[2] - 24); rect(0, TILE - 1, TILE, 1, c[0] - 24, c[1] - 24, c[2] - 24); break; }
    case 'palm_leaves': { const c = [58, 132, 64]; for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) { const r = rng(); let base = c; if (r < 0.3) base = [c[0] - 16, c[1] - 16, c[2] - 16]; else if (r > 0.8) base = [c[0] + 18, c[1] + 18, c[2] + 12]; const v = (rng() - 0.5) * 8; set(x, y, base[0] + v, base[1] + v, base[2] + v, rng() < 0.14 ? 0 : 255); } break; }
    case 'neon': { fillN(255, 90, 180, 6); for (let i = 0; i < TILE; i += 3) rect(0, i, TILE, 1, 120, 240, 255); break; }
    default: fillN(200, 60, 200, 0); break;
  }
  return new ImageData(d, TILE, TILE);
}
function paintLeaves(set, rng, c) {
  const dk = [c[0] - 18, c[1] - 18, c[2] - 18], lt = [c[0] + 14, c[1] + 14, c[2] + 14];
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    const r = rng(); let base = c; if (r < 0.24) base = dk; else if (r > 0.82) base = lt;
    const v = (rng() - 0.5) * 8;
    // punch transparent gaps so leaves look airy (fancy leaves)
    const hole = rng() < 0.10;
    set(x, y, base[0] + v, base[1] + v, base[2] + v, hole ? 0 : 255);
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
// City layout constants (a city is a grid of lots separated by roads)
const CITY_SPACING = 300, CITY_RADIUS = 120, LOT = 26, ROAD_W = 8, SIDEWALK = 2;
class WorldGen {
  constructor(seed) {
    this.seed = seed >>> 0;
    this.height = makeNoise(this.seed + 1);
    this.temp = makeNoise(this.seed + 2);
    this.moist = makeNoise(this.seed + 3);
    this.tree = makeNoise(this.seed + 4);
    this.cave = makeNoise(this.seed + 5);
    this.cave2 = makeNoise(this.seed + 6);
    this.ravine = makeNoise(this.seed + 7);
    this.cache = new Map();
    this.cityCache = new Map();
  }
  column(wx, wz) {
    const key = wx + ',' + wz;
    let c = this.cache.get(key);
    if (c) return c;
    const cont = this.height.fbm(wx * 0.006, wz * 0.006, 4);
    const hills = this.height.fbm(wx * 0.02 + 99, wz * 0.02, 3);
    let h = SEA + 4 + cont * 16 + hills * 6;
    // continent-scale climate: travel far and you reach distinctly different mega-regions
    const climate = this.temp.fbm(wx * 0.0009 + 500, wz * 0.0009, 2) * 0.9;
    const t = this.temp.fbm(wx * 0.004 + 11, wz * 0.004, 2) + climate;
    const m = this.moist.fbm(wx * 0.004, wz * 0.004 + 23, 2);
    let biome = 'plains';
    if (t > 0.32 && m < 0.0) biome = 'desert';
    else if (t < -0.32) biome = 'snow';
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
      const ca = this.cityAt(wx, wz);
      if (ca) { this.genCityColumn(chunk, lx, lz, wx, wz, ca); continue; }
      const col = this.column(wx, wz);
      const h = col.h, biome = col.biome;
      for (let y = 0; y <= h; y++) {
        let id = B.STONE;
        if (y === 0) id = B.BEDROCK;
        else if (y <= 2 && this.hash(wx, y, wz) < 0.55) id = B.BEDROCK;
        else if (y > h - 4) {
          if (biome === 'desert') id = (y === h) ? B.SAND : B.SANDSTONE;
          else if (y === h) id = (h <= SEA) ? (biome === 'snow' ? B.GRAVEL : B.SAND) : (biome === 'snow' ? B.SNOW : B.GRASS);
          else id = B.DIRT;
        }
        set(lx, y, lz, id);
      }
      // carve caves & ravines (never touch bedrock crust)
      this.carve(chunk, lx, lz, wx, wz, h);
      // ores (only in remaining stone)
      for (let y = 1; y < h - 1; y++) {
        if (chunk.blocks[idx(lx, y, lz)] !== B.STONE) continue; const r = this.hash(wx, y, wz);
        if (y < 14 && r > 0.9985) set(lx, y, lz, B.EMERALD_ORE);
        else if (y < 14 && r > 0.991) set(lx, y, lz, B.DIAMOND);
        else if (y < 22 && r > 0.984) set(lx, y, lz, B.GOLD);
        else if (y < 16 && r > 0.968 && r < 0.982) set(lx, y, lz, B.REDSTONE_ORE);
        else if (r > 0.95 && r < 0.962) set(lx, y, lz, B.IRON);
        else if (r > 0.915 && r < 0.935) set(lx, y, lz, B.COAL);
      }
      // water + beaches
      if (h < SEA) { for (let y = h + 1; y <= SEA; y++) set(lx, y, lz, B.WATER); if (biome === 'snow') set(lx, SEA, lz, B.ICE); }
    }
    this.decorate(chunk);
  }
  carve(chunk, lx, lz, wx, wz, h) {
    const air = (y) => { if (y < 1 || y > CY - 1) return; const i = idx(lx, y, lz); const cur = chunk.blocks[i]; if (cur === B.BEDROCK || cur === B.WATER) return; chunk.blocks[i] = B.AIR; };
    // ravines: long narrow vertical canyons along thin noise bands
    const rv = this.ravine.fbm(wx * 0.009, wz * 0.009, 2);
    if (Math.abs(rv) < 0.02) {
      const top = Math.min(h - 1, SEA + 4), bot = 11;
      for (let y = bot; y <= top; y++) air(y);
    }
    // spaghetti caves: where two 3D noise fields both cross zero
    const top = Math.min(h - 1, CY - 2);
    for (let y = 5; y <= top; y++) {
      const a = this.cave.n3(wx * 0.055, y * 0.08, wz * 0.055);
      const b = this.cave2.n3(wx * 0.055 + 40, y * 0.08, wz * 0.055 + 40);
      if (a * a + b * b < 0.0055) { air(y); continue; }
      // cheese pockets deeper down
      if (y < 32 && this.cave.fbm3(wx * 0.045, y * 0.07, wz * 0.045, 3) > 0.62) air(y);
    }
  }
  // --- City generation ---
  cityInfo(gx, gz) {
    const key = 'c' + gx + ',' + gz; let info = this.cityCache.get(key); if (info) return info;
    const cx = gx * CITY_SPACING, cz = gz * CITY_SPACING;
    const isCity = (gx === 0 && gz === 0) || this.hash(gx, 777, gz) > 0.6;
    let groundY = SEA + 5;
    if (isCity) { const cont = this.height.fbm(cx * 0.006, cz * 0.006, 3); groundY = Math.floor(clamp(SEA + 6 + cont * 5, SEA + 3, SEA + 11)); }
    info = { city: isCity, cx, cz, groundY };
    if (this.cityCache.size > 400) this.cityCache.clear();
    this.cityCache.set(key, info); return info;
  }
  cityAt(wx, wz) {
    const gx = Math.round(wx / CITY_SPACING), gz = Math.round(wz / CITY_SPACING);
    const info = this.cityInfo(gx, gz); if (!info.city) return null;
    const dx = wx - info.cx, dz = wz - info.cz;
    if (Math.abs(dx) > CITY_RADIUS || Math.abs(dz) > CITY_RADIUS) return null;
    return { info, dx, dz };
  }
  cityRoadAt(wx, wz) { const ca = this.cityAt(wx, wz); if (!ca) return false; const u = ca.dx + CITY_RADIUS, v = ca.dz + CITY_RADIUS; const ru = ((u % LOT) + LOT) % LOT, rv = ((v % LOT) + LOT) % LOT; return ru < ROAD_W || rv < ROAD_W; }
  spawnPoint() {
    for (let r = 0; r < 80; r++) for (let a = 0; a < 12; a++) { const wx = Math.round(Math.cos(a / 12 * 6.283) * r), wz = Math.round(Math.sin(a / 12 * 6.283) * r); if (this.cityRoadAt(wx, wz)) { const ca = this.cityAt(wx, wz); return { x: wx, y: ca.info.groundY, z: wz }; } }
    const sy = SEA + 8; return { x: 0, y: sy, z: 0 };
  }
  genCityColumn(chunk, lx, lz, wx, wz, ca) {
    const set = (y, id) => { if (y >= 0 && y < CY) chunk.blocks[idx(lx, y, lz)] = id; };
    const g = ca.info.groundY;
    for (let y = 0; y <= g; y++) { let id = B.STONE; if (y === 0) id = B.BEDROCK; else if (y <= 2 && this.hash(wx, y, wz) < 0.5) id = B.BEDROCK; else if (y > g - 3) id = B.DIRT; set(y, id); }
    this.carve(chunk, lx, lz, wx, wz, g - 4);
    const u = ca.dx + CITY_RADIUS, v = ca.dz + CITY_RADIUS;
    const ru = ((u % LOT) + LOT) % LOT, rv = ((v % LOT) + LOT) % LOT;
    const roadU = ru < ROAD_W, roadV = rv < ROAD_W;
    if (roadU || roadV) {
      set(g, B.ASPHALT); const c = ROAD_W >> 1;
      if (!(roadU && roadV)) { if (roadU && ru === c) set(g, B.ROADLINE); else if (roadV && rv === c) set(g, B.ROADLINE); }
      return;
    }
    if (ru < ROAD_W + SIDEWALK || rv < ROAD_W + SIDEWALK || ru >= LOT - SIDEWALK || rv >= LOT - SIDEWALK) {
      set(g, B.CONCRETE);
      if (ru === ROAD_W + 1 && rv === ROAD_W + 1) { set(g + 1, B.OBSIDIAN); set(g + 2, B.OBSIDIAN); set(g + 3, B.OBSIDIAN); set(g + 4, B.GLOWSTONE); }
      else if (ru === ROAD_W + 1 && rv % 7 === 4) set(g + 1, B.PLANKS);
      return;
    }
    // building lot interior
    const a = ROAD_W + SIDEWALK, W = LOT - SIDEWALK - a; // 14x14
    const bxL = ru - a, bzL = rv - a;
    const lotX = Math.floor(u / LOT), lotZ = Math.floor(v / LOT);
    if (this.hash(lotX, 5, lotZ) < 0.16) { // park
      set(g, B.GRASS); const cp = W >> 1;
      if (bxL === cp && bzL === cp) { for (let k = 1; k <= 4; k++) set(g + k, B.LOG); set(g + 5, B.PALM_LEAVES); set(g + 6, B.PALM_LEAVES); }
      else if (Math.abs(bxL - cp) <= 1 && Math.abs(bzL - cp) <= 1) set(g + 5, B.PALM_LEAVES);
      else if (bzL === 1 && bxL % 4 === 2) set(g + 1, B.PLANKS);
      return;
    }
    set(g, B.CONCRETE);
    const stories = 1 + Math.floor(this.hash(lotX, 9, lotZ) * 6); const H = stories * 4;
    const mr = this.hash(lotX, 13, lotZ);
    const mat = mr < 0.22 ? B.STUCCO_TEAL : mr < 0.44 ? B.STUCCO_PINK : mr < 0.64 ? B.STUCCO_CREAM : mr < 0.8 ? B.STUCCO_CORAL : mr < 0.92 ? B.QUARTZ : B.CONCRETE;
    const corner = (bxL === 0 || bxL === W - 1) && (bzL === 0 || bzL === W - 1);
    const perim = (bxL === 0 || bxL === W - 1 || bzL === 0 || bzL === W - 1);
    if (perim && bzL === 0 && (bxL === 1 || bxL === W - 2)) set(g + 1, B.NEON); // neon storefront accents
    if (perim) {
      for (let y = g + 1; y <= g + H; y++) {
        const sy = (y - (g + 1)) % 4; let id = mat;
        if ((sy === 1 || sy === 2) && !corner && ((bxL + bzL) % 2 === 0)) id = B.WINDOW;
        set(y, id);
      }
      set(g + H + 1, mat);
      if (bzL === 0 && bxL === (W >> 1)) { set(g + 1, B.AIR); set(g + 2, B.AIR); } // doorway
    } else {
      for (let y = g + 1; y <= g + H; y++) set(y, (y - (g + 1)) % 4 === 0 ? mat : B.AIR);
      set(g + H + 1, mat);
    }
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
      const wx = bx + ox, wz = bz + oz; if (this.cityAt(wx, wz)) continue; const col = this.column(wx, wz);
      if (col.h < SEA + 1 || col.biome === 'desert') continue;
      const density = col.biome === 'forest' ? 0.045 : 0.012;
      if (this.hash(wx, 7, wz) > density) continue;
      this.tree_(put, wx, col.h + 1, wz, col.biome);
    }
    // surface plants (within chunk)
    for (let lz = 0; lz < CZ; lz++) for (let lx = 0; lx < CX; lx++) {
      const wx = bx + lx, wz = bz + lz; if (this.cityAt(wx, wz)) continue; const col = this.column(wx, wz);
      if (col.h < SEA + 1) continue;
      const top = chunk.blocks[idx(lx, col.h, lz)];
      const above = idx(lx, col.h + 1, lz);
      if (chunk.blocks[above] !== B.AIR) continue;
      const r = this.hash(wx, 31, wz);
      if (top === B.GRASS) { if (r < 0.02) chunk.blocks[above] = B.POPPY; else if (r < 0.22) chunk.blocks[above] = B.TALLGRASS; }
      else if (top === B.SAND && col.biome === 'desert' && r > 0.985) { const ch = 1 + (this.hash(wx, 5, wz) * 3 | 0); for (let k = 0; k < ch; k++) chunk.blocks[idx(lx, col.h + 1 + k, lz)] = B.CACTUS; }
    }
    // palm trees lining the city streets (crowns seam across chunks)
    for (let oz = -M; oz < CZ + M; oz++) for (let ox = -M; ox < CX + M; ox++) {
      const wx = bx + ox, wz = bz + oz; const ca = this.cityAt(wx, wz); if (!ca) continue;
      const u = ca.dx + CITY_RADIUS, v = ca.dz + CITY_RADIUS, ru = ((u % LOT) + LOT) % LOT, rv = ((v % LOT) + LOT) % LOT;
      if (ru < ROAD_W || rv < ROAD_W) continue; // not on the road
      const sidewalk = ru < ROAD_W + SIDEWALK || rv < ROAD_W + SIDEWALK || ru >= LOT - SIDEWALK || rv >= LOT - SIDEWALK;
      if (sidewalk && ((ru === ROAD_W + 1 && rv % 12 === 6) || (rv === ROAD_W + 1 && ru % 12 === 6))) this.palm(put, wx, ca.info.groundY + 1, wz);
    }
  }
  palm(put, wx, wy, wz) {
    const h = 5 + (this.hash(wx, 2, wz) * 3 | 0);
    for (let i = 0; i < h; i++) put(wx, wy + i, wz, B.LOG, 'log');
    const top = wy + h; put(wx, top, wz, B.PALM_LEAVES, 'leaf');
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { put(wx + dx, top, wz + dz, B.PALM_LEAVES, 'leaf'); put(wx + dx * 2, top - 1, wz + dz * 2, B.PALM_LEAVES, 'leaf'); }
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
  if (sd.render === 'leaves') return true; // fancy leaves: draw every face so holes reveal depth
  if (self === n && nd.render !== 'cross') return false; // merge same transparent (water/glass)
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
function buf() { return { pos: [], nor: [], uv: [], ao: [], sky: [], tint: [], sway: [], idx: [], n: 0 }; }
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
    b.sway.push(d.render === 'leaves' ? 1 : 0); // leaves sway gently in the wind
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
      for (let i = 0; i < 4; i++) { b.pos.push(x + pts[i][0], y + pts[i][1], z + pts[i][2]); b.nor.push(0, 1, 0); b.uv.push(uvc[i][0], uvc[i][1]); b.ao.push(0.95); b.sky.push(sky); b.tint.push(tint[0], tint[1], tint[2]); b.sway.push(pts[i][1] > 0.5 ? 1.8 : 0); }
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
  lightLevelAt(wx, wy, wz, day) { const s = this.getSky(Math.floor(wx), Math.floor(wy), Math.floor(wz)) / 15, b = this.getBlk(Math.floor(wx), Math.floor(wy), Math.floor(wz)) / 15; return Math.max(b, s * day); }

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
  // write blocks without per-block relight/remesh; call flushEdits() once when done (for placing structures)
  setBlockQuiet(wx, wy, wz, id) {
    if (wy < 0 || wy >= CY) return false; const cx = Math.floor(wx / CX), cz = Math.floor(wz / CZ); const c = this.getC(cx, cz); if (!c || c.state === 'empty') return false;
    const lx = wx - cx * CX, lz = wz - cz * CZ; c.blocks[idx(lx, wy, lz)] = id;
    (this.edits[this.key(cx, cz)] || (this.edits[this.key(cx, cz)] = {}))[idx(lx, wy, lz)] = id;
    (this._dirty || (this._dirty = new Set())).add(this.key(cx, cz)); return true;
  }
  flushEdits() {
    if (!this._dirty) return; const keys = new Set();
    for (const k of this._dirty) { const p = k.split(',').map(Number); for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) keys.add(this.key(p[0] + dx, p[1] + dz)); }
    for (const k of keys) { const c = this.chunks.get(k); if (c && c.state !== 'empty') computeLight(c); }
    for (const k of keys) { const c = this.chunks.get(k); if (c && c.state === 'meshed') this.mesh(c); }
    this._dirty = null;
  }

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
      g.setAttribute('sway', new THREE.Float32BufferAttribute(d.sway, 1));
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
    attribute float ao; attribute float skylight; attribute vec3 tint; attribute float sway;
    varying vec2 vUv; varying float vAo; varying float vSky; varying vec3 vTint; varying float vFog;
    uniform float uTime, uFogNear, uFogFar; uniform int uWave;
    void main(){
      vUv=uv; vAo=ao; vSky=skylight; vTint=tint;
      vec4 wp = modelMatrix * vec4(position,1.0);
      if (uWave==1 && normal.y>0.5) wp.y += (sin(uTime*1.5 + wp.x*0.7 + wp.z*0.7) + sin(uTime*0.9 - wp.x*0.4 + wp.z*1.1)*0.5)*0.05 - 0.11;
      if (sway > 0.0) {
        float wind = sin(uTime*1.7 + wp.x*0.6 + wp.z*0.6) + 0.4*sin(uTime*2.7 + wp.x*1.4 - wp.z*0.7);
        wp.x += wind * 0.075 * sway;
        wp.z += cos(uTime*1.5 + wp.z*0.55 + wp.x*0.3) * 0.06 * sway;
      }
      vec4 mv = viewMatrix*wp; vFog = clamp((length(mv.xyz)-uFogNear)/(uFogFar-uFogNear),0.0,1.0);
      gl_Position = projectionMatrix*mv;
    }`;
  const frag = (mode) => `
    uniform sampler2D map; uniform float uDay, uAmbient, uTime; uniform vec3 uFog;
    varying vec2 vUv; varying float vAo; varying float vSky; varying vec3 vTint; varying float vFog;
    void main(){
      vec4 t = texture2D(map, vUv);
      ${mode === 'cutout' ? 'if (t.a < 0.5) discard;' : ''}
      float light = max(uAmbient, vSky*uDay);
      vec3 c = t.rgb * vTint * light * vAo;
      ${mode === 'water' ? 'c *= 1.0 + 0.07*sin(uTime*2.0 + gl_FragCoord.x*0.06 + gl_FragCoord.y*0.06); gl_FragColor = vec4(mix(c, uFog, vFog), 0.80);' : ''}
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
// Weather (rain / snow particle field that follows the camera)
// ---------------------------------------------------------------------------
class Weather {
  constructor(scene) {
    this.N = 1100; this.bx = 30, this.by = 28; this.active = false; this.type = 'rain'; this.t = 0;
    this.pos = new Float32Array(this.N * 3);
    for (let i = 0; i < this.N; i++) { this.pos[i * 3] = (Math.random() - 0.5) * this.bx * 2; this.pos[i * 3 + 1] = Math.random() * this.by - 4; this.pos[i * 3 + 2] = (Math.random() - 0.5) * this.bx * 2; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.mat = new THREE.PointsMaterial({ color: 0x9fb8e0, size: 0.11, transparent: true, opacity: 0, depthWrite: false });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.points.visible = false; scene.add(this.points);
    this.timer = 50 + Math.random() * 90;
  }
  raining() { return this.active && this.mat.opacity > 0.12; }
  update(dt, cam, snowy) {
    this.t += dt; this.timer -= dt;
    if (this.timer <= 0) { this.active = !this.active; this.timer = this.active ? (35 + Math.random() * 55) : (90 + Math.random() * 150); }
    this.type = snowy ? 'snow' : 'rain';
    this.mat.color.set(this.type === 'snow' ? 0xf4f8ff : 0x9fb8e0); this.mat.size = this.type === 'snow' ? 0.16 : 0.1;
    const target = this.active ? (this.type === 'snow' ? 0.9 : 0.55) : 0;
    this.mat.opacity += (target - this.mat.opacity) * Math.min(1, dt * 1.5);
    if (this.mat.opacity < 0.02) { this.points.visible = false; return; }
    this.points.visible = true;
    const fall = this.type === 'snow' ? 3.5 : 22, drift = this.type === 'snow' ? 0.8 : 0;
    const p = this.pos;
    for (let i = 0; i < this.N; i++) {
      p[i * 3 + 1] -= fall * dt;
      if (drift) p[i * 3] += Math.sin(this.t * 1.3 + i) * drift * dt;
      if (p[i * 3 + 1] < -4) { p[i * 3 + 1] = this.by - 4; p[i * 3] = (Math.random() - 0.5) * this.bx * 2; p[i * 3 + 2] = (Math.random() - 0.5) * this.bx * 2; }
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.position.set(cam.position.x, cam.position.y, cam.position.z);
  }
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
  LEATHER: 278, BEEF: 279, PORK: 280, MUTTON: 281, CHICKEN_F: 282,
  BONE: 283, STRING: 284, GUNPOWDER: 285, FEATHER: 286, ROTTEN: 287, PEARL: 288, GOLD_NUGGET: 289,
  EMERALD: 290, REDSTONE: 291,
  L_HELM: 292, L_CHEST: 293, L_LEGS: 294, L_BOOTS: 295,
  I_HELM: 296, I_CHEST: 297, I_LEGS: 298, I_BOOTS: 299,
  D_HELM: 300, D_CHEST: 301, D_LEGS: 302, D_BOOTS: 303,
  PISTOL: 304, SMG: 305, RIFLE: 306, SHOTGUN: 307, SNIPER: 308, CASH: 309, KNIFE: 310, BAT: 311,
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
  [B.CACTUS]: { s: 0.4 }, [B.POPPY]: { s: 0 }, [B.TALLGRASS]: { s: 0, drop: null },
  [B.RED_SAND]: { s: 0.5, t: 'shovel' }, [B.TERRACOTTA]: { s: 1.25, t: 'pickaxe', need: T_WOOD }, [B.CLAY]: { s: 0.6, t: 'shovel' },
  [B.NETHERRACK]: { s: 0.4, t: 'pickaxe', need: T_WOOD }, [B.NETHER_BRICK]: { s: 2, t: 'pickaxe', need: T_WOOD },
  [B.END_STONE]: { s: 3, t: 'pickaxe', need: T_WOOD }, [B.QUARTZ]: { s: 0.8, t: 'pickaxe', need: T_WOOD },
  [B.IRON_BLOCK]: { s: 5, t: 'pickaxe', need: T_STONE }, [B.GOLD_BLOCK]: { s: 3, t: 'pickaxe', need: T_IRON },
  [B.DIAMOND_BLOCK]: { s: 5, t: 'pickaxe', need: T_IRON }, [B.EMERALD_BLOCK]: { s: 5, t: 'pickaxe', need: T_IRON },
  [B.REDSTONE_BLOCK]: { s: 5, t: 'pickaxe', need: T_STONE },
  [B.EMERALD_ORE]: { s: 3, t: 'pickaxe', need: T_IRON, drop: ITEM.EMERALD },
  [B.REDSTONE_ORE]: { s: 3, t: 'pickaxe', need: T_IRON, drop: ITEM.REDSTONE, count: 4 },
  [B.CRAFTING_TABLE]: { s: 2.5, t: 'axe' }, [B.FURNACE]: { s: 3.5, t: 'pickaxe', need: T_WOOD },
  [B.BEDROCK]: { s: -1, drop: null },
  [B.ASPHALT]: { s: 1.5, t: 'pickaxe', need: T_WOOD }, [B.CONCRETE]: { s: 1.6, t: 'pickaxe', need: T_WOOD },
  [B.ROADLINE]: { s: 1.5, t: 'pickaxe', need: T_WOOD }, [B.WINDOW]: { s: 0.3, drop: null },
  [B.STUCCO_TEAL]: { s: 1.2, t: 'pickaxe', need: T_WOOD }, [B.STUCCO_PINK]: { s: 1.2, t: 'pickaxe', need: T_WOOD },
  [B.STUCCO_CREAM]: { s: 1.2, t: 'pickaxe', need: T_WOOD }, [B.STUCCO_CORAL]: { s: 1.2, t: 'pickaxe', need: T_WOOD },
  [B.PALM_LEAVES]: { s: 0.2, drop: null }, [B.NEON]: { s: 0.4 },
};
function surv(id) { return SURV[id] || { s: 1 }; }
function dropOf(id) { const sv = surv(id); if (sv.drop === null) return null; if (sv.drop !== undefined) return sv.drop; return id; }

const ITEMS = {};
const cap = s => s[0].toUpperCase() + s.slice(1);
function it(id, o) { ITEMS[id] = Object.assign({ id, stack: 64 }, o); }
it(ITEM.STICK, { name: 'Stick' }); it(ITEM.COAL, { name: 'Coal' }); it(ITEM.DIAMOND, { name: 'Diamond' });
it(ITEM.IRON, { name: 'Iron Ingot' }); it(ITEM.GOLD, { name: 'Gold Ingot' }); it(ITEM.APPLE, { name: 'Apple', food: 4 });
it(ITEM.LEATHER, { name: 'Leather' }); it(ITEM.BEEF, { name: 'Steak', food: 8 }); it(ITEM.PORK, { name: 'Cooked Porkchop', food: 8 });
it(ITEM.MUTTON, { name: 'Cooked Mutton', food: 6 }); it(ITEM.CHICKEN_F, { name: 'Cooked Chicken', food: 6 }); it(ITEM.BONE, { name: 'Bone' });
it(ITEM.STRING, { name: 'String' }); it(ITEM.GUNPOWDER, { name: 'Gunpowder' }); it(ITEM.FEATHER, { name: 'Feather' });
it(ITEM.ROTTEN, { name: 'Rotten Flesh', food: 2 }); it(ITEM.PEARL, { name: 'Ender Pearl' }); it(ITEM.GOLD_NUGGET, { name: 'Gold Nugget' });
it(ITEM.EMERALD, { name: 'Emerald' }); it(ITEM.REDSTONE, { name: 'Redstone Dust' });
// armor (slot: 0 head, 1 chest, 2 legs, 3 feet)
const ARMOR_SETS = [['L', 'Leather', 0x9a6a40], ['I', 'Iron', 0xd2d2d6], ['D', 'Diamond', 0x5ad7d2]];
ARMOR_SETS.forEach(([k, nm, col], ti) => {
  const b = ti + 1;
  it(ITEM[k + '_HELM'], { name: nm + ' Helmet', stack: 1, armor: true, slot: 0, defense: b + 1, acol: col });
  it(ITEM[k + '_CHEST'], { name: nm + ' Chestplate', stack: 1, armor: true, slot: 1, defense: b + 3, acol: col });
  it(ITEM[k + '_LEGS'], { name: nm + ' Leggings', stack: 1, armor: true, slot: 2, defense: b + 2, acol: col });
  it(ITEM[k + '_BOOTS'], { name: nm + ' Boots', stack: 1, armor: true, slot: 3, defense: b + 1, acol: col });
});
// guns: dmg, cd (s/shot), auto, pellets, spread, range, clip, reload (s), tracer color
it(ITEM.PISTOL, { name: 'Pistol', stack: 1, gun: true, dmg: 6, cd: 0.26, auto: false, pellets: 1, spread: 0.012, range: 60, clip: 12, reload: 1.0, tracer: 0xffe98a });
it(ITEM.SMG, { name: 'SMG', stack: 1, gun: true, dmg: 4, cd: 0.075, auto: true, pellets: 1, spread: 0.035, range: 50, clip: 30, reload: 1.4, tracer: 0xffe98a });
it(ITEM.RIFLE, { name: 'Assault Rifle', stack: 1, gun: true, dmg: 7, cd: 0.11, auto: true, pellets: 1, spread: 0.02, range: 90, clip: 30, reload: 1.7, tracer: 0xffe98a });
it(ITEM.SHOTGUN, { name: 'Shotgun', stack: 1, gun: true, dmg: 3, cd: 0.85, auto: false, pellets: 9, spread: 0.11, range: 26, clip: 6, reload: 2.0, tracer: 0xffd070 });
it(ITEM.SNIPER, { name: 'Sniper Rifle', stack: 1, gun: true, dmg: 22, cd: 1.25, auto: false, pellets: 1, spread: 0.0, range: 180, clip: 5, reload: 2.4, tracer: 0xcfe8ff });
it(ITEM.CASH, { name: 'Cash', stack: 9999, cash: true });
it(ITEM.KNIFE, { name: 'Knife', stack: 1, melee: true, dmg: 7 });
it(ITEM.BAT, { name: 'Baseball Bat', stack: 1, melee: true, dmg: 6 });
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
  const sv = surv(blockId); const h = sv.s == null ? 1 : sv.s; if (h < 0) return Infinity; if (h === 0) return 0.04;
  const tl = heldId != null ? itemDef(heldId) : null; let mult = 1;
  if (tl && tl.tool === sv.t) mult = tl.speed || 1;
  return Math.max(0.05, h * (canHarvest(blockId, heldId) ? 1.5 : 5) / mult);
}

class Inventory {
  constructor() { this.slots = new Array(36).fill(null); this.sel = 0; this.cursor = null; this.craft = new Array(9).fill(null); this.craftSize = 2; this.armor = new Array(4).fill(null); }
  defense() { let d = 0; for (const a of this.armor) if (a) d += itemDef(a.id).defense || 0; return d; }
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
// blocks & utilities
aShaped(B.CRAFTING_TABLE, 1, [[B.PLANKS, B.PLANKS], [B.PLANKS, B.PLANKS]]);
aShaped(B.FURNACE, 1, [[B.COBBLE, B.COBBLE, B.COBBLE], [B.COBBLE, null, B.COBBLE], [B.COBBLE, B.COBBLE, B.COBBLE]]);
aShaped(B.SANDSTONE, 1, [[B.SAND, B.SAND], [B.SAND, B.SAND]]);
aShaped(B.BRICK, 1, [[B.CLAY, B.CLAY], [B.CLAY, B.CLAY]]);
aShaped(B.BOOKSHELF, 1, [[B.PLANKS, B.PLANKS, B.PLANKS], [B.LOG, B.LOG, B.LOG], [B.PLANKS, B.PLANKS, B.PLANKS]]);
aShaped(B.GLOWSTONE, 1, [[ITEM.GOLD_NUGGET, ITEM.GOLD_NUGGET], [ITEM.GOLD_NUGGET, ITEM.GOLD_NUGGET]]);
aShaped(B.WOOL, 1, [[ITEM.STRING, ITEM.STRING], [ITEM.STRING, ITEM.STRING]]);
// 9-block storage <-> ingots
const STORE = [[ITEM.IRON, B.IRON_BLOCK], [ITEM.GOLD, B.GOLD_BLOCK], [ITEM.DIAMOND, B.DIAMOND_BLOCK], [ITEM.EMERALD, B.EMERALD_BLOCK], [ITEM.REDSTONE, B.REDSTONE_BLOCK]];
for (const [ing, blk] of STORE) { aShaped(blk, 1, [[ing, ing, ing], [ing, ing, ing], [ing, ing, ing]]); aShapeless(ing, 9, [blk]); }
aShapeless(ITEM.GOLD_NUGGET, 9, [ITEM.GOLD]);
// armor (standard helmet/chest/legs/boots shapes)
const AMAT = { L: ITEM.LEATHER, I: ITEM.IRON, D: ITEM.DIAMOND };
ARMOR_SETS.forEach(([k]) => {
  const x = AMAT[k];
  aShaped(ITEM[k + '_HELM'], 1, [[x, x, x], [x, null, x]]);
  aShaped(ITEM[k + '_CHEST'], 1, [[x, null, x], [x, x, x], [x, x, x]]);
  aShaped(ITEM[k + '_LEGS'], 1, [[x, x, x], [x, null, x], [x, null, x]]);
  aShaped(ITEM[k + '_BOOTS'], 1, [[x, null, x], [x, null, x]]);
});
// guns (iron frame + redstone mechanism + gunpowder)
{ const I = ITEM.IRON, R = ITEM.REDSTONE, G = ITEM.GUNPOWDER;
  aShaped(ITEM.PISTOL, 1, [[I, I], [null, R]]);
  aShaped(ITEM.SMG, 1, [[I, I, I], [R, R, null]]);
  aShaped(ITEM.RIFLE, 1, [[I, I, I], [G, R, R]]);
  aShaped(ITEM.SHOTGUN, 1, [[I, I, I], [G, R, null]]);
  aShaped(ITEM.SNIPER, 1, [[I, I, I], [null, R, G], [null, R, null]]);
  aShaped(ITEM.KNIFE, 1, [[ITEM.IRON], [ITEM.STICK]]);
  aShaped(ITEM.BAT, 1, [[B.PLANKS], [B.PLANKS], [ITEM.STICK]]);
}
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
// Mobs & dropped items
// ---------------------------------------------------------------------------
function entSolid(world, x, y, z) { const id = world.getBlock(Math.floor(x), Math.floor(y), Math.floor(z)); return id !== B.AIR && blockDef(id).solid; }
function entMove(e, world, dt) {
  e.onGround = false; const hw = e.w / 2;
  for (const a of [0, 1, 2]) {
    const comp = ['x', 'y', 'z'][a]; const amt = e.vel[comp] * dt; if (!amt) continue; const p = e.pos; p[comp] += amt;
    const x0 = Math.floor(p.x - hw), x1 = Math.floor(p.x + hw - 1e-4), y0 = Math.floor(p.y), y1 = Math.floor(p.y + e.h - 1e-4), z0 = Math.floor(p.z - hw), z1 = Math.floor(p.z + hw - 1e-4);
    let lim = amt > 0 ? Infinity : -Infinity, hit = false;
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) { if (!entSolid(world, x, y, z)) continue; hit = true; const lo = a === 0 ? x : a === 1 ? y : z; if (amt > 0) lim = Math.min(lim, lo); else lim = Math.max(lim, lo + 1); }
    if (!hit) continue; const ep = 1e-3;
    if (a === 0) p.x = amt > 0 ? lim - hw - ep : lim + hw + ep;
    else if (a === 2) p.z = amt > 0 ? lim - hw - ep : lim + hw + ep;
    else { if (amt > 0) p.y = lim - e.h - ep; else { p.y = lim + ep; e.onGround = true; } }
    e.vel[comp] = 0;
  }
}
const MOBDEF = {
  cow: { hostile: false, hp: 10, w: 0.9, h: 1.4, speed: 1.6, drops: [[ITEM.LEATHER, 0, 2], [ITEM.BEEF, 1, 3]] },
  pig: { hostile: false, hp: 10, w: 0.9, h: 1.1, speed: 1.7, drops: [[ITEM.PORK, 1, 3]] },
  sheep: { hostile: false, hp: 8, w: 0.9, h: 1.3, speed: 1.6, drops: [[B.WOOL, 1, 1], [ITEM.MUTTON, 1, 2]] },
  chicken: { hostile: false, hp: 4, w: 0.5, h: 0.7, speed: 1.7, drops: [[ITEM.CHICKEN_F, 1, 1], [ITEM.FEATHER, 0, 2]], floaty: true },
  zombie: { hostile: true, hp: 20, w: 0.6, h: 1.9, speed: 1.9, dmg: 3, drops: [[ITEM.ROTTEN, 0, 2]], burns: true },
  skeleton: { hostile: true, hp: 20, w: 0.6, h: 1.9, speed: 2.1, dmg: 2, drops: [[ITEM.BONE, 0, 2]], burns: true },
  creeper: { hostile: true, hp: 20, w: 0.6, h: 1.7, speed: 1.9, dmg: 0, creeper: true, drops: [[ITEM.GUNPOWDER, 0, 2]] },
  spider: { hostile: true, hp: 16, w: 1.2, h: 0.9, speed: 2.6, dmg: 2, drops: [[ITEM.STRING, 0, 2]], neutralDay: true },
  enderman: { hostile: true, hp: 30, w: 0.6, h: 2.7, speed: 2.4, dmg: 4, drops: [[ITEM.PEARL, 0, 1]], neutralDay: true },
  slime: { hostile: true, hp: 8, w: 1.0, h: 1.0, speed: 1.4, dmg: 2, drops: [[ITEM.STRING, 0, 1]] },
  npc: { hostile: false, hp: 20, w: 0.6, h: 1.85, speed: 1.35, drops: [], city: true },
  cop: { hostile: true, hp: 28, w: 0.6, h: 1.85, speed: 2.5, dmg: 0, drops: [], cop: true },
};
// ---------------------------------------------------------------------------
// NPC personas (no API — names, jobs, an economy + a rule-based chat engine)
// ---------------------------------------------------------------------------
const NPC_FIRST = ['Alex', 'Sam', 'Jordan', 'Maria', 'Liam', 'Noah', 'Emma', 'Olivia', 'Ava', 'Ethan', 'Mia', 'Lucas', 'Sofia', 'Leo', 'Nora', 'Hugo', 'Ivy', 'Max', 'Zoe', 'Theo', 'Ruby', 'Felix', 'Iris', 'Omar', 'Aria', 'Dev', 'Kai', 'Luna', 'Eli', 'Nina', 'Priya', 'Marco'];
const NPC_LAST = ['Reed', 'Stone', 'Park', 'Vale', 'Cruz', 'Kim', 'Brooks', 'Hayes', 'Nash', 'Wells', 'Frost', 'Lane', 'Quinn', 'Ford', 'Diaz', 'Webb', 'Cole', 'Bell', 'Shaw', 'Okafor'];
const JOBS = [
  { t: 'barista', wage: 14, cls: 'working' }, { t: 'teacher', wage: 24, cls: 'working' }, { t: 'software engineer', wage: 62, cls: 'middle' },
  { t: 'nurse', wage: 34, cls: 'working' }, { t: 'shop owner', wage: 40, cls: 'middle' }, { t: 'bus driver', wage: 20, cls: 'working' },
  { t: 'chef', wage: 28, cls: 'working' }, { t: 'banker', wage: 80, cls: 'rich' }, { t: 'doctor', wage: 96, cls: 'rich' },
  { t: 'lawyer', wage: 85, cls: 'rich' }, { t: 'street musician', wage: 8, cls: 'poor' }, { t: 'janitor', wage: 13, cls: 'working' },
  { t: 'artist', wage: 16, cls: 'poor' }, { t: 'police officer', wage: 30, cls: 'working' }, { t: 'CEO', wage: 220, cls: 'rich' },
  { t: 'cashier', wage: 12, cls: 'working' }, { t: 'construction worker', wage: 26, cls: 'working' }, { t: 'florist', wage: 18, cls: 'working' },
  { t: 'taxi driver', wage: 19, cls: 'working' }, { t: 'librarian', wage: 22, cls: 'working' },
];
const MOODS = ['cheerful', 'tired', 'busy', 'relaxed', 'grumpy', 'curious', 'anxious', 'content'];
const HOBBIES = ['painting', 'jogging', 'cooking', 'gaming', 'gardening', 'reading', 'fishing', 'playing guitar', 'chess', 'photography', 'birdwatching', 'baking'];
const SKINS = [0xf2cfa6, 0xe7b58a, 0xc68642, 0x8d5524, 0xffe0bd, 0xd9a066];
const HAIRS = [0x2b1d10, 0x4a2f17, 0x111111, 0x6b4a2a, 0x8a8a8a, 0xc9a23a, 0xa33b2a];
const SHIRTS = [0x3f7cb4, 0xb44545, 0x4caf50, 0xcaa23a, 0x8e5cb4, 0x444a52, 0xd2d2d6, 0xd47ba0];
let NPC_SEQ = 0;
const LOOT_MATS = [8, 3, 2, 5, 261, 257]; // log, stone, dirt, sand, apple, coal
function makePersona(homeless) {
  const r = () => Math.random();
  if (homeless) {
    return {
      id: ++NPC_SEQ, first: NPC_FIRST[r() * NPC_FIRST.length | 0], last: NPC_LAST[r() * NPC_LAST.length | 0],
      job: 'drifter', wage: 4, cls: 'poor', money: Math.round(r() * 14), age: 22 + (r() * 45 | 0),
      mood: r() < 0.5 ? 'tired' : 'content', hobby: HOBBIES[r() * HOBBIES.length | 0],
      skin: SKINS[r() * SKINS.length | 0], hair: HAIRS[r() * HAIRS.length | 0], shirt: [0x5a5048, 0x6b5b3a, 0x47443f][r() * 3 | 0], pants: 0x3a352c,
      homeless: true, loot: LOOT_MATS[r() * LOOT_MATS.length | 0], mem: { name: null, turns: 0, lastTopic: null },
    };
  }
  const job = JOBS[r() * JOBS.length | 0];
  const cls = job.cls;
  const money = cls === 'rich' ? 2000 + r() * 9000 : cls === 'middle' ? 400 + r() * 1600 : cls === 'poor' ? r() * 60 : 80 + r() * 600;
  return {
    id: ++NPC_SEQ,
    first: NPC_FIRST[r() * NPC_FIRST.length | 0], last: NPC_LAST[r() * NPC_LAST.length | 0],
    job: job.t, wage: job.wage, cls, money: Math.round(money), age: 18 + (r() * 50 | 0),
    mood: MOODS[r() * MOODS.length | 0], hobby: HOBBIES[r() * HOBBIES.length | 0],
    skin: SKINS[r() * SKINS.length | 0], hair: HAIRS[r() * HAIRS.length | 0], shirt: SHIRTS[r() * SHIRTS.length | 0], pants: 0x33384a + (r() * 0x202020 | 0),
    mem: { name: null, turns: 0, lastTopic: null }, lastPaid: 0,
  };
}
function makeCopPersona() {
  const r = () => Math.random();
  return {
    id: ++NPC_SEQ, first: 'Officer', last: NPC_LAST[r() * NPC_LAST.length | 0],
    job: 'police officer', wage: 30, cls: 'working', money: Math.round(80 + r() * 300), age: 25 + (r() * 30 | 0),
    mood: 'busy', hobby: 'keeping the peace', skin: SKINS[r() * SKINS.length | 0], hair: 0x1c2233,
    shirt: 0x213a78, pants: 0x1a1f2c, cop: true, mem: { name: null, turns: 0, lastTopic: null },
  };
}
function namedPersona(name) { const p = makePersona(); const parts = name.split(' '); p.first = parts[0]; p.last = parts.slice(1).join(' '); p.story = true; return p; }
// The story campaign — an original Neon Bay crime-comedy in 5 chapters.
const MISSIONS = [
  { title: 'Fresh Off the Bus', intro: 'You roll into Neon Bay with fifty bucks and a dream. Your cousin Tony said to meet him on the corner.', reward: 100,
    steps: [{ type: 'talk', text: 'Meet your cousin Tony', who: 'Tony Marenco', at: { dx: 7, dz: 14 } }] },
  { title: 'Borrowed Wheels', intro: 'Tony: "Welcome to the Bay, cuz. First job’s easy — boost us a set of wheels."', reward: 350,
    steps: [{ type: 'getcar', text: 'Steal any car  (press F next to one)' }, { type: 'drive', text: 'Deliver it to the lockup', at: { dx: -34, dz: 30 } }] },
  { title: 'Heat of the Night', intro: 'Tony: "Cops ran the plates. Lose ’em before they pin it on us."', reward: 650,
    steps: [{ type: 'evade', text: 'Lose the cops — escape your wanted level', wanted: 3 }] },
  { title: 'Bad Blood', intro: 'Tony: "The Salcido crew is muscling in on our turf. Go send them a message."', reward: 1500,
    steps: [{ type: 'kill', text: 'Take out the Salcido thugs', count: 3, at: { dx: 28, dz: -22 } }] },
  { title: 'King of Neon Bay', intro: 'Tony: "You’re the real deal, cuz. That penthouse uptown? It’s yours now."', reward: 5000, final: true,
    steps: [{ type: 'goto', text: 'Claim your penthouse', at: { dx: -18, dz: -38 } }] },
];
function makeFamilyPersona(role) {
  const r = () => Math.random();
  const mom = role === 'mom';
  return {
    id: ++NPC_SEQ, first: mom ? 'Mom' : 'Dad', last: 'Reyes', role,
    job: mom ? 'nurse' : 'mechanic', wage: 30, cls: 'middle', money: 600 + (r() * 800 | 0), age: 30 + (r() * 12 | 0),
    mood: 'cheerful', hobby: mom ? 'cooking' : 'fixing cars',
    skin: SKINS[r() * SKINS.length | 0], hair: HAIRS[r() * HAIRS.length | 0],
    shirt: mom ? 0xd47ba0 : 0x3f7cb4, pants: 0x33384a, family: true, mem: { name: null, turns: 0, lastTopic: null },
  };
}
// a swinging limb (pivots at the top): segment + an end piece (hand/foot)
function limb(w, h, d, segCol, x, topY, z, endCol, endH, endW) {
  const grp = new THREE.Group(); grp.position.set(x, topY, z);
  const rad = Math.min(w, d) * 0.5;
  const seg = new THREE.Mesh(new THREE.CapsuleGeometry(rad, Math.max(0.01, h - rad * 2), 4, 8), new THREE.MeshLambertMaterial({ color: segCol })); seg.position.y = -h / 2; seg.userData.base = new THREE.Color(segCol); grp.add(seg);
  if (endCol != null) { const e = new THREE.Mesh(new THREE.BoxGeometry((endW || w * 1.1), endH, d * (endW ? 1.5 : 1.1)), new THREE.MeshLambertMaterial({ color: endCol })); e.position.set(0, -h - endH / 2 + 0.04, endW ? -d * 0.18 : 0); e.userData.base = new THREE.Color(endCol); grp.add(e); }
  return grp;
}
function buildNpcModel(p) {
  const g = new THREE.Group(); const legs = []; const add = m => { g.add(m); return m; };
  const shoe = 0x222428, hipY = 0.92, legLen = 0.92;
  // legs (pants + shoes) — pivot at hips
  for (const sx of [-0.13, 0.13]) legs.push(add(limb(0.19, legLen, 0.2, p.pants, sx, hipY, 0, shoe, 0.12, 0.22)));
  // torso: smooth tapered body + rounded head
  add(capsule(0.22, 0.5, p.shirt, 0, 1.3, 0));            // torso
  add(box(0.5, 0.18, 0.26, p.shirt, 0, 1.56, 0));         // shoulders
  add(capsule(0.08, 0.06, p.skin, 0, 1.74, 0));           // neck
  const head = add(ball(0.26, p.skin, 0, 1.98, 0));       // rounded head
  // face
  add(box(0.085, 0.09, 0.04, 0x20262c, -0.1, 2.0, -0.22)); add(box(0.085, 0.09, 0.04, 0x20262c, 0.1, 2.0, -0.22)); // eyes
  add(box(0.07, 0.06, 0.05, p.skin, 0, 1.92, -0.23));      // nose
  add(box(0.14, 0.03, 0.02, 0x7a4a44, 0, 1.84, -0.22));    // mouth
  // hair / cap
  if (p.cop) { add(box(0.46, 0.13, 0.46, 0x16203f, 0, 2.22, 0)); add(box(0.46, 0.06, 0.16, 0x16203f, 0, 2.16, -0.26)); add(box(0.1, 0.1, 0.04, 0xe8d24a, 0, 1.5, -0.14)); }
  else { const hs = p.id % 3; add(box(0.46, 0.16, 0.46, p.hair, 0, 2.2, 0)); add(box(0.46, 0.2, 0.1, p.hair, 0, 2.0, 0.22)); if (hs === 1) add(box(0.46, 0.4, 0.12, p.hair, 0, 1.85, 0.25)); if (hs === 2) { add(box(0.5, 0.1, 0.5, p.hair, 0, 2.28, 0)); } }
  // arms (sleeve to elbow, skin hand) — pivot at shoulders
  for (const sx of [-0.34, 0.34]) legs.push(add(limb(0.16, 0.5, 0.18, p.shirt, sx, 1.66, 0, p.skin, 0.18)));
  return { group: g, legs, head };
}
// ---------------------------------------------------------------------------
// Real glTF models (community CC0 assets, loaded at runtime). Falls back to the
// procedural models above if the model can't be reached (e.g. offline).
// ---------------------------------------------------------------------------
const ASSETS = { ready: false };
// CC0 rigged + animated character (public domain). Swap for any CC0 humanoid GLB.
const MODEL_CHAR_URL = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/models/gltf/RobotExpressive/RobotExpressive.glb';
async function loadModels(onReady) {
  try {
    const gltfMod = await import(/* @vite-ignore */ window.__GLTF_URL__);
    const skMod = await import(/* @vite-ignore */ window.__SK_URL__);
    ASSETS.SkeletonUtils = skMod;
    const loader = new gltfMod.GLTFLoader();
    const url = window.__MODEL_CHAR__ || MODEL_CHAR_URL;
    loader.load(url, (gltf) => {
      // normalise: scale so the character is ~1.85 tall with feet at y=0
      const box = new THREE.Box3().setFromObject(gltf.scene); const sz = new THREE.Vector3(); box.getSize(sz);
      const s = 1.85 / (sz.y || 1.85); ASSETS.charScale = s; ASSETS.charMinY = box.min.y * s;
      ASSETS.char = gltf.scene; ASSETS.charAnims = gltf.animations || []; ASSETS.ready = true;
      if (onReady) onReady();
    }, undefined, (err) => { console.warn('[models] character GLB unavailable, using built-in models:', err && err.message || err); });
  } catch (e) { console.warn('[models] glTF loader unavailable, using built-in models:', e && e.message || e); }
}
function buildGltfHuman(p) {
  const clone = ASSETS.SkeletonUtils.clone(ASSETS.char);
  const inner = new THREE.Group(); inner.add(clone);
  const s = ASSETS.charScale || 1; clone.scale.setScalar(s); clone.position.y = -(ASSETS.charMinY || 0);
  // gentle per-person colour variety on the model's materials
  const tint = new THREE.Color(p.shirt || 0xffffff);
  clone.traverse(o => { if (o.isMesh && o.material) { o.material = o.material.clone(); if (o.material.color) o.material.color.lerp(tint, 0.25); o.castShadow = false; } });
  const grp = new THREE.Group(); grp.add(inner);
  const mixer = new THREE.AnimationMixer(clone); const by = {}; for (const a of (ASSETS.charAnims || [])) by[a.name] = a;
  const act = n => by[n] ? mixer.clipAction(by[n]) : null;
  const actions = { idle: act('Idle'), walk: act('Walking') || act('Running'), run: act('Running') };
  if (actions.idle) actions.idle.play();
  return { group: grp, legs: [], head: null, mixer, actions, gltf: true };
}
// Rule-based conversational engine — varied, persona-flavored, fully offline.
function npcReply(p, raw) {
  const t = ' ' + raw.toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  const has = (...ws) => ws.some(w => t.includes(' ' + w + ' '));
  const pick = a => a[Math.random() * a.length | 0];
  const m = p.mem; m.turns++;
  const Name = p.first, full = p.first + ' ' + p.last;
  const you = m.name ? (', ' + m.name) : '';
  const moodWrap = s => {
    if (p.mood === 'grumpy') return pick([s, s + ' ...look, I\'m busy.', 'Ugh. ' + s]);
    if (p.mood === 'tired') return pick([s, s + ' *yawn*', s + ' Sorry, long day.']);
    if (p.mood === 'busy') return pick([s, s + ' Gotta keep moving though.']);
    if (p.mood === 'cheerful') return pick([s, s + ' 😊'.replace('😊', ''), s + ' Lovely to chat!']);
    return s;
  };
  // loving parents talk a little differently
  if (p.family) {
    const kid = m.name || 'sweetie', who = p.role === 'mom' ? 'your mom' : 'your dad';
    if (has('home', 'house', 'where', 'go', 'lost')) return pick(['Stay close, ' + kid + ' — let\'s get you home.', 'Home\'s just this way. Follow me!', 'Come on, ' + kid + ', home\'s not far.']);
    if (has('love', 'hug', 'mom', 'dad', 'family')) return pick(['I love you so much, ' + kid + '. ❤'.replace('❤', ''), 'You\'re going to do great things, kiddo.', 'We\'re so proud of you already.']);
    if (has('hi', 'hello', 'hey', 'sup', 'goo goo', 'ga ga')) return pick(['There\'s my little one! I\'m ' + who + '.', 'Hi ' + kid + '! Welcome to the world.', 'Aww, hello baby!']);
    if (has('food', 'hungry', 'eat', 'milk')) return pick(['Let\'s get you fed once we\'re home.', 'Hungry already? Just like your ' + (p.role === 'mom' ? 'dad' : 'mom') + '.']);
    return pick(['Let\'s head home, ' + kid + '.', 'I\'m right here with you.', 'Everything\'s going to be okay, ' + kid + '.', 'Follow me home and I\'ll take care of you.']);
  }
  // capture player name
  let mName = raw.match(/\b(?:i'?m|i am|my name is|call me|name's)\s+([A-Za-z][a-z]{1,15})/i);
  if (mName && !has('not', 'fine', 'good', 'ok', 'okay', 'here', 'lost', 'hungry', 'tired', 'rich', 'poor')) { m.name = mName[1][0].toUpperCase() + mName[1].slice(1); return pick(['Nice to meet you, ' + m.name + '! I\'m ' + Name + '.', 'Hey ' + m.name + ', good to meet you. ' + Name + '.', m.name + '? Great name. I\'m ' + Name + ', I\'m a ' + p.job + '.']); }
  if (has('bye', 'goodbye', 'see you', 'see ya', 'later', 'cya', 'farewell', 'gtg', 'gotta go')) return pick(['Take care' + you + '!', 'See you around the city.', 'Bye! Watch the traffic out there.', 'Later' + you + '.']);
  if (has('thank', 'thanks', 'thx', 'appreciate')) return pick(['Anytime' + you + '!', 'No problem at all.', 'Happy to help.', 'You\'re welcome!']);
  if (has('hi', 'hello', 'hey', 'yo', 'sup', 'hiya', 'howdy', 'greetings', 'good morning', 'good evening')) { m.lastTopic = 'greet'; return moodWrap(pick(['Hey there' + you + '! I\'m ' + Name + '.', 'Hello! ' + Name + ', nice to meet you.', 'Hi! You new around here?', 'Hey! Welcome to the city.'])); }
  if (has('how are you', 'how are u', 'how r u', 'hows it going', "how's it going", 'you doing', 'how do you do', 'how have you been', 'hows life', "how's life")) {
    const byMood = { cheerful: 'Fantastic, thanks for asking!', tired: 'Exhausted, honestly. Work\'s been rough.', busy: 'Swamped, but can\'t complain.', relaxed: 'Pretty chill today.', grumpy: 'Could be better. Could be worse.', curious: 'Curious as ever — lots going on!', anxious: 'A bit on edge, but I\'ll manage.', content: 'Can\'t complain, life\'s good.' };
    return byMood[p.mood] + ' How about you' + you + '?';
  }
  if (has('your name', 'whats your name', "what's your name", 'who are you', 'who r u', 'name')) return pick(['I\'m ' + full + '.', 'Name\'s ' + Name + '. I work as a ' + p.job + '.', 'They call me ' + Name + '.']);
  if (has('what do you do', 'your job', 'your work', 'occupation', 'for a living', 'where do you work', 'do you work', 'profession', 'career')) {
    m.lastTopic = 'job';
    const feel = p.cls === 'rich' ? 'Pays very well, I\'m not complaining.' : p.cls === 'poor' ? 'Doesn\'t pay much, but it\'s what I love.' : 'It pays the bills.';
    return 'I\'m a ' + p.job + '. ' + feel + ' (about $' + p.wage + '/hr)';
  }
  if (has('how much', 'money', 'rich', 'poor', 'broke', 'salary', 'wage', 'earn', 'wealthy', 'cash', 'savings')) {
    if (p.cls === 'rich') return pick(['Let\'s just say I\'m comfortable — about $' + p.money + ' in the bank.', 'Money? I do alright. ' + p.job + ' life.', 'I\'ve got around $' + p.money + ' saved. Hard work pays off.']);
    if (p.cls === 'poor') return pick(['Barely scraping by, honestly. Maybe $' + p.money + ' to my name.', 'Money\'s tight. Being a ' + p.job + ' isn\'t lucrative.', 'I\'ve got like $' + p.money + '. Rent\'s brutal.']);
    return pick(['I get by — around $' + p.money + ' saved up.', 'Middle of the road. A ' + p.job + '\'s wage, you know?', 'Comfortable enough. $' + p.money + ' or so.']);
  }
  if (has('class', 'society', 'inequality', 'wealth gap')) return pick(['This city\'s got its rich towers and its poorer corners. I\'m ' + p.cls + ' class, myself.', 'Class is everything here. The CEOs up top, folks like me getting by.']);
  if (has('city', 'town', 'this place', 'live here', 'neighborhood', 'around here', 'place')) { m.lastTopic = 'city'; return pick(['This city never sleeps — cars, shops, people everywhere.', 'It\'s busy, but it\'s home. Mind the traffic on the roads.', 'Lots of folks here, all chasing something. I like it.', 'Big city life! Skyscrapers, parks, the works.']); }
  if (has('where', 'how do i get', 'find', 'nearest', 'directions', 'which way', 'shop', 'store', 'bank', 'park', 'restaurant', 'cafe', 'coffee')) {
    return pick(['Head down the main road and take a left at the lamp post.', 'Couple blocks that way — follow the road markings.', 'There\'s a park near the center, and shops along the avenues.', 'Just follow the sidewalks, you\'ll run into it.']);
  }
  if (has('family', 'kids', 'children', 'married', 'wife', 'husband', 'partner', 'spouse', 'son', 'daughter')) return pick(['Got a small family back home, keeps me going.', 'No kids yet, maybe someday.', 'My family means everything to me.', 'It\'s just me and my cat, honestly.']);
  if (has('weather', 'rain', 'sunny', 'cold', 'hot', 'snow', 'sky')) return pick(['Weather here changes fast — keep an umbrella handy.', 'Looks like it might rain later. Or not. City weather!', 'Nice enough out, I suppose.']);
  if (has('hobby', 'hobbies', 'free time', 'fun', 'like to do', 'for fun', 'spare time', 'enjoy')) return 'I love ' + p.hobby + ' when I\'m off the clock. ' + pick(['You should try it!', 'Really clears the head.', 'Best part of my week.']);
  if (has('how old', 'your age', 'age')) return pick(['I\'m ' + p.age + '.', Name + ', age ' + p.age + ', at your service.', p.age + ' years young!']);
  if (has('job offer', 'hiring', 'work for you', 'need a job', 'looking for work', 'give me a job', 'employ')) return pick(['Ha! I can barely keep my own job. Try the shops downtown.', 'The city job board\'s always posting. Good luck!', 'We might be hiring — talk to my boss, the shop owner.']);
  if (has('buy', 'sell', 'trade', 'shopping', 'for sale', 'price')) return pick(['I\'m not selling, but the shops down the road might be.', 'Trade? Take it to the market square.', 'Sorry, I\'m just on my lunch break.']);
  if (has('love you', 'marry me', 'date', 'cute', 'beautiful', 'handsome', 'attractive')) return moodWrap(pick(['Oh— that\'s sweet, but I barely know you!', 'Flattering! Let\'s start with coffee.', 'Ha! You\'re bold, I\'ll give you that.']));
  if (has('stupid', 'idiot', 'dumb', 'ugly', 'hate you', 'shut up', 'loser', 'moron', 'jerk')) { return p.mood === 'grumpy' ? pick(['Excuse me?! Get lost.', 'Real charming. Goodbye.']) : pick(['...That\'s uncalled for.', 'Wow. Have a nice day, I guess.', 'No need to be rude, friend.']); }
  if (has('nice', 'cool', 'awesome', 'great', 'good job', 'amazing', 'kind')) return moodWrap(pick(['Aw, thanks' + you + '!', 'You\'re too kind.', 'That made my day.']));
  if (has('help', 'lost', 'what do i do', 'confused', 'how does this work', 'what now')) return pick(['New in town? Explore the streets, talk to folks, watch for cars.', 'You can build outside the city, or just wander and chat with people like me.', 'Mind the traffic, visit the park, and don\'t get mugged after dark!']);
  if (has('food', 'hungry', 'eat', 'lunch', 'dinner', 'breakfast', 'snack')) return pick(['There\'s a great cafe a few blocks down.', 'I\'d kill for a sandwich right now.', 'Grab a bite at the market, best food in the city.']);
  if (has('are you real', 'are you a bot', 'are you ai', 'are you human', 'npc', 'robot', 'computer', 'program')) return pick(['Real as the concrete under your boots, friend.', 'Ha, philosophical today, are we? I\'m as real as this city.', 'I\'m just ' + Name + ', living my life. Same as you.']);
  if (has('yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'nope', 'no', 'nah')) return pick(['Right.', 'Fair enough.', 'Mm, I hear you.', 'Anyway — what brings you to the city?']);
  if (has('weather', 'time', 'late', 'night', 'day')) return pick(['Time flies in the city.', 'Getting late — careful after dark.']);
  if (t.trim().endsWith('?') || has('what', 'why', 'how', 'when', 'who', 'where')) return pick(['Hmm, good question' + you + '. Not sure I\'m the right person to ask.', 'Beats me! I\'m just a ' + p.job + '.', 'Honestly? No idea. The city keeps its secrets.']);
  // fallback — varied filler + a follow-up that keeps the convo going
  return moodWrap(pick([
    'Heh, you\'re an interesting one. Anyway, I\'m ' + Name + ', the ' + p.job + '.',
    'I hear you. Life in the city, am I right?',
    'Can\'t say I follow, but it\'s nice to chat. What do you do' + you + '?',
    'Mm. You from around here?',
    'Interesting. I\'m off to ' + p.hobby + ' later — you should find a hobby too.',
    'The streets are busy today. You been to the park yet?',
  ]));
}
function box(w, h, d, color, x, y, z) { const g = new THREE.BoxGeometry(w, h, d); const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color })); m.position.set(x, y, z); m.userData.base = new THREE.Color(color); return m; }
function legMesh(w, h, d, color, x, hy, z) { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, -h / 2, 0); const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color })); m.position.set(x, hy, z); m.userData.base = new THREE.Color(color); return m; }
// smooth primitives for rounded, less-blocky characters
function ball(r, color, x, y, z) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), new THREE.MeshLambertMaterial({ color })); m.position.set(x, y, z); m.userData.base = new THREE.Color(color); return m; }
function capsule(r, len, color, x, y, z) { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.01, len), 4, 10), new THREE.MeshLambertMaterial({ color })); m.position.set(x, y, z); m.userData.base = new THREE.Color(color); return m; }
function buildMobModel(type) {
  const g = new THREE.Group(); const legs = []; let head = null; const add = m => { g.add(m); return m; };
  const EYE = 0x20262c;
  if (type === 'cow' || type === 'pig' || type === 'sheep') {
    const col = { cow: 0x52402f, pig: 0xe39aa6, sheep: 0xe9e2d6 }[type]; const by = 0.78, bh = 0.6, bl = 1.1;
    add(box(0.7, bh, bl, col, 0, by, 0));
    const hz = -bl / 2 - 0.15, hcol = type === 'cow' ? 0x6b4a32 : col;
    head = add(box(0.55, 0.55, 0.5, hcol, 0, by + 0.18, hz));
    add(box(0.1, 0.1, 0.04, EYE, -0.14, by + 0.27, hz - 0.26)); add(box(0.1, 0.1, 0.04, EYE, 0.14, by + 0.27, hz - 0.26));
    if (type === 'sheep') {
      add(box(0.96, 0.86, 1.3, 0xf7f3ea, 0, by + 0.06, 0)); // wool coat
      add(box(0.5, 0.5, 0.42, 0x36322f, 0, by + 0.16, hz)); // dark face
      for (const sx of [-0.27, 0.27]) add(box(0.12, 0.16, 0.1, 0x36322f, sx, by + 0.2, hz + 0.16));
      add(box(0.1, 0.1, 0.04, EYE, -0.13, by + 0.26, hz - 0.22)); add(box(0.1, 0.1, 0.04, EYE, 0.13, by + 0.26, hz - 0.22));
    } else if (type === 'cow') {
      add(box(0.36, 0.22, 0.16, 0xc2a98f, 0, by + 0.0, hz - 0.22)); // snout
      add(box(0.09, 0.18, 0.09, 0xeae0cf, -0.16, by + 0.48, hz)); add(box(0.09, 0.18, 0.09, 0xeae0cf, 0.16, by + 0.48, hz)); // horns
      add(box(0.34, 0.2, 0.5, 0xeee8dc, 0.2, by + 0.12, 0.12)); add(box(0.3, 0.22, 0.34, 0xeee8dc, -0.22, by + 0.04, -0.18)); // white patches
      add(box(0.26, 0.16, 0.2, 0xe6a0a8, 0, by - bh / 2 + 0.02, 0.26)); // udder
      for (const sx of [-0.3, 0.3]) add(box(0.13, 0.1, 0.08, hcol, sx, by + 0.34, hz + 0.05)); // ears
    } else { // pig
      add(box(0.26, 0.2, 0.12, 0xd98793, 0, by + 0.04, hz - 0.27)); // snout
      add(box(0.05, 0.06, 0.04, 0x7a4a52, -0.07, by + 0.04, hz - 0.34)); add(box(0.05, 0.06, 0.04, 0x7a4a52, 0.07, by + 0.04, hz - 0.34)); // nostrils
      for (const sx of [-0.17, 0.17]) add(box(0.13, 0.13, 0.06, 0xd98793, sx, by + 0.46, hz - 0.02)); // ears
    }
    const hy = by - bh / 2, lcol = type === 'cow' ? 0x40301f : (type === 'pig' ? 0xcf8893 : 0x6f6a62);
    for (const [sx, sz] of [[-0.22, 0.38], [0.22, 0.38], [-0.22, -0.38], [0.22, -0.38]]) legs.push(add(legMesh(0.18, hy, 0.18, lcol, sx, hy, sz)));
  } else if (type === 'chicken') {
    add(box(0.4, 0.42, 0.45, 0xf2f2f2, 0, 0.42, 0)); head = add(box(0.3, 0.3, 0.3, 0xf6f6f6, 0, 0.72, -0.2));
    add(box(0.12, 0.1, 0.12, 0xe0a020, 0, 0.72, -0.38)); add(box(0.12, 0.12, 0.06, 0xd02020, 0, 0.86, -0.16)); // beak + comb
    add(box(0.07, 0.06, 0.04, EYE, -0.1, 0.74, -0.36)); add(box(0.07, 0.06, 0.04, EYE, 0.1, 0.74, -0.36)); // eyes
    add(box(0.1, 0.06, 0.08, 0xd02020, 0, 0.62, -0.34)); // wattle
    add(box(0.08, 0.28, 0.36, 0xe8e8e8, -0.23, 0.44, 0.03)); add(box(0.08, 0.28, 0.36, 0xe8e8e8, 0.23, 0.44, 0.03)); // wings
    add(box(0.22, 0.24, 0.1, 0xeaeaea, 0, 0.52, 0.26)); // tail
    for (const sx of [-0.11, 0.11]) legs.push(add(legMesh(0.07, 0.24, 0.07, 0xe0a020, sx, 0.24, 0)));
  } else if (type === 'zombie' || type === 'skeleton') {
    const skin = type === 'zombie' ? 0x4f7a3a : 0xdadada, cloth = type === 'zombie' ? 0x35507f : 0xcfcfcf;
    add(box(0.55, 0.7, 0.3, cloth, 0, 1.05, 0)); head = add(box(0.5, 0.5, 0.5, type === 'zombie' ? 0x4f7a3a : 0xeeeeee, 0, 1.65, 0));
    const ec = type === 'zombie' ? 0x16240f : 0x202020;
    add(box(0.12, 0.1, 0.04, ec, -0.12, 1.7, -0.26)); add(box(0.12, 0.1, 0.04, ec, 0.12, 1.7, -0.26)); // eye sockets
    if (type === 'skeleton') add(box(0.08, 0.12, 0.04, 0x202020, 0, 1.56, -0.26)); // nasal
    for (const sx of [-0.37, 0.37]) legs.push(add(legMesh(0.2, 0.7, 0.2, skin, sx, 1.4, 0))); // arms
    for (const sx of [-0.16, 0.16]) legs.push(add(legMesh(0.22, 0.7, 0.22, type === 'zombie' ? 0x32508a : 0xbdbdbd, sx, 0.7, 0))); // legs
  } else if (type === 'enderman') {
    add(box(0.4, 1.1, 0.3, 0x161620, 0, 1.5, 0)); head = add(box(0.45, 0.5, 0.45, 0x0d0d14, 0, 2.3, 0));
    add(box(0.32, 0.08, 0.04, 0xd9a6ff, 0, 2.34, -0.24)); // glowing eye band
    add(box(0.1, 0.1, 0.05, 0xeacaff, -0.1, 2.34, -0.25)); add(box(0.1, 0.1, 0.05, 0xeacaff, 0.1, 2.34, -0.25));
    for (const sx of [-0.32, 0.32]) legs.push(add(legMesh(0.14, 1.0, 0.14, 0x101018, sx, 2.0, 0)));
    for (const sx of [-0.12, 0.12]) legs.push(add(legMesh(0.16, 1.1, 0.16, 0x0c0c12, sx, 1.0, 0)));
  } else if (type === 'creeper') {
    add(box(0.6, 1.1, 0.35, 0x4caf50, 0, 0.95, 0)); head = add(box(0.5, 0.5, 0.5, 0x57c25b, 0, 1.62, 0));
    const f = 0x132018; // the iconic creeper face
    add(box(0.13, 0.13, 0.04, f, -0.12, 1.7, -0.26)); add(box(0.13, 0.13, 0.04, f, 0.12, 1.7, -0.26)); // eyes
    add(box(0.12, 0.24, 0.04, f, 0, 1.5, -0.26)); add(box(0.26, 0.1, 0.04, f, 0, 1.45, -0.26)); // mouth
    for (const [sx, sz] of [[-0.18, 0.18], [0.18, 0.18], [-0.18, -0.18], [0.18, -0.18]]) legs.push(add(legMesh(0.18, 0.4, 0.18, 0x3f9e44, sx, 0.4, sz)));
  } else if (type === 'spider') {
    add(box(0.9, 0.55, 1.0, 0x2a2320, 0, 0.5, 0.25)); head = add(box(0.55, 0.45, 0.45, 0x352b26, 0, 0.5, -0.5));
    add(box(0.12, 0.08, 0.06, 0xcc2222, -0.14, 0.6, -0.72)); add(box(0.12, 0.08, 0.06, 0xcc2222, 0.14, 0.6, -0.72)); // big eyes
    for (const sx of [-0.08, 0.08]) add(box(0.06, 0.05, 0.04, 0xaa2222, sx, 0.52, -0.72)); // small eyes
    for (let i = 0; i < 4; i++) { const zz = -0.1 + i * 0.22; legs.push(add(legMesh(0.06, 0.5, 0.55, 0x1d1714, -0.52, 0.55, zz))); legs.push(add(legMesh(0.06, 0.5, 0.55, 0x1d1714, 0.52, 0.55, zz))); }
  } else if (type === 'slime') {
    const m = add(box(0.9, 0.9, 0.9, 0x6dc24a)); m.material.transparent = true; m.material.opacity = 0.78; m.position.y = 0.45;
    head = add(box(0.12, 0.12, 0.04, 0x2a5a22, -0.16, 0.52, -0.46)); add(box(0.12, 0.12, 0.04, 0x2a5a22, 0.16, 0.52, -0.46)); // eyes
    add(box(0.16, 0.1, 0.04, 0x2a5a22, 0, 0.34, -0.46)); // mouth
  }
  return { group: g, legs, head };
}
class ItemEnt {
  constructor(world, x, y, z, item, count, mesh) { this.kind = 'item'; this.world = world; this.pos = new THREE.Vector3(x, y, z); this.vel = new THREE.Vector3((Math.random() - 0.5) * 2, 2.5, (Math.random() - 0.5) * 2); this.w = 0.25; this.h = 0.25; this.item = item; this.count = count; this.age = 0; this.delay = 0.4; this.dead = false; this.group = mesh; }
}
class Mob {
  constructor(type, x, y, z, persona) { this.type = type; this.def = MOBDEF[type]; this.pos = new THREE.Vector3(x, y, z); this.vel = new THREE.Vector3(); this.w = this.def.w; this.h = this.def.h; this.hp = this.def.hp; this.yaw = Math.random() * 6.28; this.onGround = false; this.timer = Math.random() * 3; this.attackCd = 0; this.fuse = 0; this.hurt = 0; this.dead = false; this.phase = Math.random() * 6;
    let m; if (type === 'npc' || type === 'cop') { this.npc = type === 'cop' ? makeCopPersona() : (persona || makePersona()); m = (ASSETS.ready && ASSETS.char) ? buildGltfHuman(this.npc) : buildNpcModel(this.npc); } else m = buildMobModel(type);
    this.group = m.group; this.legs = m.legs; this.head = m.head; this.mixer = m.mixer || null; this.actions = m.actions || null; this.gltf = !!m.gltf; }
  aabb() { const hw = this.w / 2; return { minX: this.pos.x - hw, maxX: this.pos.x + hw, minY: this.pos.y, maxY: this.pos.y + this.h, minZ: this.pos.z - hw, maxZ: this.pos.z + hw }; }
  damage(n, kx, kz, mgr) { this.hp -= n; this.hurt = 0.25; if (kx !== undefined) { this.vel.x += kx * 5; this.vel.z += kz * 5; this.vel.y = 4; } if (!this.def.hostile) { this.flee = 5; } if (this.hp <= 0) this.die(mgr); }
  die(mgr) {
    if (this.dead) return; this.dead = true;
    mgr.hitFx(this.pos.x, this.pos.y + this.h * 0.5, this.pos.z, this.npc ? 0xb01010 : 0x884422, 16);
    for (const [item, mn, mx] of this.def.drops) { const c = mn + Math.floor(Math.random() * (mx - mn + 1)); for (let i = 0; i < c; i++) mgr.dropItem(this.pos.x, this.pos.y + this.h * 0.4, this.pos.z, item, 1); }
    if (this.npc) { const loot = clamp(Math.round((this.npc.money || 0) * 0.25) + 10, 10, 800); mgr.dropCash(this.pos.x, this.pos.y + 0.5, this.pos.z, loot); mgr.alarm(this.pos.x, this.pos.z, 22); if (this.npc.loot) for (let i = 0, n = 1 + (Math.random() * 3 | 0); i < n; i++) mgr.dropItem(this.pos.x, this.pos.y + 0.4, this.pos.z, this.npc.loot, 1); }
  }
}
function buildCarModel(color) {
  const g = new THREE.Group(); const add = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: c })); m.position.set(x, y, z); m.userData.base = new THREE.Color(c); g.add(m); return m; };
  const dk = new THREE.Color(color).multiplyScalar(0.7).getHex();
  add(2.5, 0.55, 5.4, color, 0, 0.62, 0);              // main body
  add(2.5, 0.34, 5.4, dk, 0, 0.34, 0);                 // lower skirt (darker)
  add(2.3, 0.18, 1.6, dk, 0, 0.92, -2.0);              // hood
  add(2.3, 0.18, 1.4, dk, 0, 0.92, 2.0);               // trunk
  add(2.1, 0.66, 2.6, color, 0, 1.18, 0.0);            // cabin
  add(1.95, 0.5, 2.3, 0x9fd0e6, 0, 1.22, 0.0);         // windows
  add(2.12, 0.66, 0.12, color, 0, 1.18, -1.3);         // windshield pillar front
  add(0.45, 0.2, 0.16, 0xfff2b0, -0.85, 0.66, -2.72); add(0.45, 0.2, 0.16, 0xfff2b0, 0.85, 0.66, -2.72); // headlights
  add(0.45, 0.18, 0.12, 0xcc2222, -0.85, 0.66, 2.72); add(0.45, 0.18, 0.12, 0xcc2222, 0.85, 0.66, 2.72); // taillights
  for (const [sx, sz] of [[-1.18, -1.7], [1.18, -1.7], [-1.18, 1.7], [1.18, 1.7]]) { // round wheels
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.34, 14), new THREE.MeshLambertMaterial({ color: 0x121316 })); tire.rotation.z = Math.PI / 2; tire.position.set(sx, 0.46, sz); tire.userData.base = new THREE.Color(0x121316); g.add(tire);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.36, 8), new THREE.MeshLambertMaterial({ color: 0x9aa0a8 })); hub.rotation.z = Math.PI / 2; hub.position.set(sx, 0.46, sz); hub.userData.base = new THREE.Color(0x9aa0a8); g.add(hub);
  }
  return g;
}
class Car {
  constructor(world, x, y, z, dir, color) { this.kind = 'car'; this.world = world; this.pos = new THREE.Vector3(x, y, z); this.dir = dir.clone(); this.speed = 4 + Math.random() * 3; this.group = buildCarModel(color); this.dead = false; this.turnCd = 0; this.yaw = Math.atan2(dir.x, dir.z); this.driver = null; this.driveSpeed = 0; }
}
function buildPlaneModel() {
  const g = new THREE.Group(); const add = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: c })); m.position.set(x, y, z); m.userData.base = new THREE.Color(c); g.add(m); return m; };
  add(1.0, 1.0, 5.2, 0xe6e9ee, 0, 0, 0);              // fuselage (nose at -Z)
  add(0.8, 0.7, 1.0, 0x9fd0e6, 0, 0.4, -1.6);         // cockpit glass
  add(6.6, 0.18, 1.3, 0xd8dce2, 0, 0.1, 0.3);         // main wings
  add(2.4, 0.16, 0.9, 0xd8dce2, 0, 0.45, 2.3);        // tail wing
  add(0.16, 1.1, 0.9, 0xc94d4d, 0, 0.7, 2.4);         // tail fin
  add(0.5, 0.5, 0.5, 0x33363c, 0, 0, -2.7);           // engine
  add(1.4, 0.14, 0.14, 0x222428, 0, 0, -3.1);         // propeller
  add(0.14, 1.4, 0.14, 0x222428, 0, 0, -3.1);
  return g;
}
class Plane {
  constructor(x, y, z) { this.kind = 'plane'; this.pos = new THREE.Vector3(x, y, z); this.group = buildPlaneModel(); this.throttle = 0.55; this.roll = 0; this.dead = false; this.driver = null; }
}
class MobManager {
  constructor(scene, world, game) { this.scene = scene; this.world = world; this.game = game; this.mobs = []; this.items = []; this.cars = []; this.planes = []; this.fx = []; this.group = new THREE.Group(); scene.add(this.group); this.spawnT = 0; this.cityT = 0; this.econT = 0; this.copT = 0; this.maxP = 18; this.maxH = 22; }
  spawn(type, x, y, z, persona) { const m = new Mob(type, x, y, z, persona); this.mobs.push(m); this.group.add(m.group); return m; }
  spawnNpc(x, y, z, homeless) { return this.spawn('npc', x, y, z, makePersona(homeless)); }
  spawnFamily(x, y, z) { const mom = this.spawn('npc', x - 1.2, y, z - 0.5, makeFamilyPersona('mom')); const dad = this.spawn('npc', x + 1.2, y, z - 0.5, makeFamilyPersona('dad')); this.family = [mom, dad]; return this.family; }
  ruralPopulate(player) {
    if (this.countNPC() >= 5) return; const w = this.world, gen = this.game.gen;
    for (let a = 0; a < 30 && this.countNPC() < 5; a++) {
      const ang = Math.random() * 6.28, r = 14 + Math.random() * 40;
      const wx = Math.floor(player.pos.x + Math.cos(ang) * r), wz = Math.floor(player.pos.z + Math.sin(ang) * r);
      if (!w.isLoaded(wx, wz) || (gen && gen.cityAt(wx, wz))) continue;
      const gy = w.highestY(wx, wz), top = w.getBlock(wx, gy, wz);
      if (top !== B.GRASS && top !== B.SAND && top !== B.SNOW) continue; if (w.getBlock(wx, gy + 1, wz) !== B.AIR) continue;
      this.spawnNpc(wx + 0.5, gy + 1, wz + 0.5, Math.random() < 0.45);
    }
  }
  dropItem(x, y, z, item, count) { const mesh = this.game.makeDropMesh(item); const e = new ItemEnt(this.world, x, y, z, item, count, mesh); this.items.push(e); this.group.add(mesh); return e; }
  countH() { return this.mobs.filter(m => m.def.hostile).length; }
  countP() { return this.mobs.filter(m => !m.def.hostile && !m.npc).length; }
  update(dt, player, dayLight) {
    dt = Math.min(dt, 0.05);
    this._spawnLoop(dt, player, dayLight);
    for (const m of this.mobs) this._mob(m, dt, player, dayLight);
    this.mobs = this.mobs.filter(m => { if (m.dead) { this.group.remove(m.group); return false; } return true; });
    for (const it of this.items) this._item(it, dt, player);
    this.items = this.items.filter(it => { if (it.dead) { this.group.remove(it.group); return false; } return true; });
    for (const c of this.cars) this._car(c, dt, player);
    this.cars = this.cars.filter(c => { if (c.dead) { this.group.remove(c.group); return false; } return true; });
    // particle FX (blood / sparks)
    for (const f of this.fx) { f.life -= dt; for (let i = 0; i < f.n; i++) { f.vel[i * 3 + 1] -= 14 * dt; f.pos[i * 3] += f.vel[i * 3] * dt; f.pos[i * 3 + 1] += f.vel[i * 3 + 1] * dt; f.pos[i * 3 + 2] += f.vel[i * 3 + 2] * dt; } f.geo.attributes.position.needsUpdate = true; f.mesh.material.opacity = Math.max(0, f.life / f.max); }
    this.fx = this.fx.filter(f => { if (f.life <= 0) { this.group.remove(f.mesh); f.geo.dispose(); f.mesh.material.dispose(); return false; } return true; });
    // police response scales with the player's wanted level
    this._copLoop(dt, player);
    // background economy: NPCs earn wages and spend over time
    this.econT += dt;
    if (this.econT > 2) { const tick = this.econT; this.econT = 0; for (const m of this.mobs) if (m.npc) { const p = m.npc; p.money += p.wage * tick * 0.04; if (Math.random() < 0.15) p.money = Math.max(0, p.money - (5 + Math.random() * 30)); p.money = Math.round(p.money); } }
    // keep the city populated around the player
    this.cityT -= dt;
    if (this.cityT <= 0) { this.cityT = 4; if (this.game.gen && this.game.gen.cityAt(Math.floor(player.pos.x), Math.floor(player.pos.z))) this.populateCity(player); else { this._despawnFar(player); this.ruralPopulate(player); } }
  }
  _despawnFar(player) {
    for (const m of this.mobs) if (m.npc && !m.def.cop && Math.hypot(m.pos.x - player.pos.x, m.pos.z - player.pos.z) > 70) m.dead = true;
    for (const c of this.cars) if (Math.hypot(c.pos.x - player.pos.x, c.pos.z - player.pos.z) > 80) c.dead = true;
  }
  countCops() { return this.mobs.filter(m => m.def.cop).length; }
  _copLoop(dt, player) {
    const want = player.wanted | 0;
    if (want <= 0) { for (const m of this.mobs) if (m.def.cop) m.dead = true; return; }
    this.copT -= dt; if (this.copT > 0) return; this.copT = 1.6;
    const target = Math.min(8, want * 2);
    let need = target - this.countCops();
    for (let a = 0; a < 30 && need > 0; a++) {
      const ang = Math.random() * 6.28, r = 22 + Math.random() * 18;
      const wx = Math.floor(player.pos.x + Math.cos(ang) * r), wz = Math.floor(player.pos.z + Math.sin(ang) * r);
      if (!this.world.isLoaded(wx, wz)) continue; const gy = this.world.highestY(wx, wz);
      if (this.world.getBlock(wx, gy + 1, wz) !== B.AIR) continue;
      this.spawn('cop', wx + 0.5, gy + 1, wz + 0.5); need--;
    }
  }
  nearestCar(pos, r) { let best = null, bd = r; for (const c of this.cars) { if (c.driver) continue; const d = Math.hypot(c.pos.x - pos.x, c.pos.z - pos.z); if (d < bd) { bd = d; best = c; } } return best; }
  spawnPlane(player) { const p = new Plane(player.pos.x, player.pos.y + 14, player.pos.z); this.planes.push(p); this.group.add(p.group); return p; }
  removePlane(p) { this.group.remove(p.group); this.planes = this.planes.filter(x => x !== p); }
  alarm(x, z, radius) { for (const m of this.mobs) if (m.npc && !m.def.cop) { if (Math.hypot(m.pos.x - x, m.pos.z - z) < radius) { m.flee = 6 + Math.random() * 3; m.timer = 4; } } }
  muggable(pos, dir) { let best = null, bd = 3; for (const m of this.mobs) { if (!m.npc || m.def.cop) continue; const dx = m.pos.x - pos.x, dz = m.pos.z - pos.z; const d = Math.hypot(dx, dz); if (d < bd) { bd = d; best = m; } } return best; }
  hitFx(x, y, z, color, n = 10) {
    const pos = new Float32Array(n * 3), vel = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; vel[i * 3] = (Math.random() - 0.5) * 5; vel[i * 3 + 1] = 2 + Math.random() * 4; vel[i * 3 + 2] = (Math.random() - 0.5) * 5; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mesh = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.18, transparent: true, depthWrite: false }));
    mesh.frustumCulled = false; this.group.add(mesh); this.fx.push({ mesh, geo, pos, vel, n, life: 0.6, max: 0.6 });
  }
  dropCash(x, y, z, amount) { if (amount <= 0) return; this.dropItem(x, y, z, ITEM.CASH, amount); }
  upgradeNpcModels() {
    if (!(ASSETS.ready && ASSETS.char)) return;
    for (const m of this.mobs) {
      if ((m.type === 'npc' || m.type === 'cop') && !m.gltf) {
        this.group.remove(m.group); const mm = buildGltfHuman(m.npc);
        m.group = mm.group; m.legs = mm.legs; m.head = mm.head; m.mixer = mm.mixer; m.actions = mm.actions; m.gltf = true; m._cur = null;
        m.group.position.set(m.pos.x, m.pos.y, m.pos.z); this.group.add(m.group);
      }
    }
  }
  countNPC() { return this.mobs.filter(m => m.npc && !m.def.cop).length; }
  populateCity(player) {
    const gen = this.game.gen, w = this.world; if (!gen) return;
    // spawn pedestrians on nearby sidewalks
    let want = 14 - this.countNPC();
    for (let a = 0; a < 60 && want > 0; a++) {
      const ang = Math.random() * 6.28, r = 8 + Math.random() * 50;
      const wx = Math.floor(player.pos.x + Math.cos(ang) * r), wz = Math.floor(player.pos.z + Math.sin(ang) * r);
      const ca = gen.cityAt(wx, wz); if (!ca) continue; if (!w.isLoaded(wx, wz)) continue;
      const top = w.getBlock(wx, ca.info.groundY, wz);
      if (top !== B.CONCRETE) continue; if (w.getBlock(wx, ca.info.groundY + 1, wz) !== B.AIR) continue;
      this.spawn('npc', wx + 0.5, ca.info.groundY + 1, wz + 0.5); want--;
    }
    // spawn cars on nearby roads
    let wantC = 6 - this.cars.length;
    for (let a = 0; a < 60 && wantC > 0; a++) {
      const ang = Math.random() * 6.28, r = 12 + Math.random() * 55;
      const wx = Math.floor(player.pos.x + Math.cos(ang) * r), wz = Math.floor(player.pos.z + Math.sin(ang) * r);
      const ca = gen.cityAt(wx, wz); if (!ca || !gen.cityRoadAt(wx, wz) || !w.isLoaded(wx, wz)) continue;
      const u = ca.dx + CITY_RADIUS, v = ca.dz + CITY_RADIUS; const ru = ((u % LOT) + LOT) % LOT, rv = ((v % LOT) + LOT) % LOT;
      const dir = ru < ROAD_W ? new THREE.Vector3(0, 0, Math.random() < 0.5 ? 1 : -1) : new THREE.Vector3(Math.random() < 0.5 ? 1 : -1, 0, 0);
      const colors = [0xb44545, 0x3f6fb4, 0x2c2f36, 0xe8e8ec, 0x4caf50, 0xcaa23a, 0x8e5cb4];
      const car = new Car(w, wx + 0.5, ca.info.groundY + 1, wz + 0.5, dir, colors[Math.random() * colors.length | 0]);
      this.cars.push(car); this.group.add(car.group); wantC--;
    }
  }
  _car(c, dt, player) {
    if (c.driver) return; // player is driving this one
    const gen = this.game.gen, w = this.world;
    if (Math.hypot(c.pos.x - player.pos.x, c.pos.z - player.pos.z) > 100) { c.dead = true; return; }
    c.turnCd -= dt;
    // look ahead; if the road ends or we're at an intersection, choose a new road direction
    const ahead = (n) => { const nx = Math.floor(c.pos.x + c.dir.x * n), nz = Math.floor(c.pos.z + c.dir.z * n); return gen.cityRoadAt(nx, nz); };
    if (!ahead(2.2) || (c.turnCd <= 0 && Math.random() < 0.5)) {
      const opts = [c.dir.clone(), new THREE.Vector3(c.dir.z, 0, -c.dir.x), new THREE.Vector3(-c.dir.z, 0, c.dir.x)];
      const good = opts.filter(d => { const nx = Math.floor(c.pos.x + d.x * 2.5), nz = Math.floor(c.pos.z + d.z * 2.5); return gen.cityRoadAt(nx, nz); });
      if (good.length) c.dir.copy(good[Math.random() * good.length | 0]); else c.dir.multiplyScalar(-1);
      c.turnCd = 1.5 + Math.random();
    }
    c.pos.x += c.dir.x * c.speed * dt; c.pos.z += c.dir.z * c.speed * dt;
    const ca = gen.cityAt(Math.floor(c.pos.x), Math.floor(c.pos.z)); if (ca) c.pos.y = ca.info.groundY + 1;
    // gentle yaw lerp toward travel dir
    const ty = Math.atan2(c.dir.x, c.dir.z); let d = ((ty - c.yaw + Math.PI) % (Math.PI * 2)) - Math.PI; c.yaw += d * Math.min(1, dt * 8);
    c.group.position.set(c.pos.x, c.pos.y + 0.2, c.pos.z); c.group.rotation.y = c.yaw;
    // nudge the player if run over
    if (Math.hypot(c.pos.x - player.pos.x, c.pos.z - player.pos.z) < 1.4 && Math.abs(c.pos.y - player.pos.y) < 2) { this.game.damagePlayer(2); player.vel.x += c.dir.x * 6; player.vel.z += c.dir.z * 6; }
  }
  _tint(group, lvl, flash) { group.traverse(o => { if (o.material && o.userData.base) { if (flash) o.material.color.setRGB(1, 0.35, 0.35); else o.material.color.copy(o.userData.base); } }); }
  _mob(m, dt, player, dayLight) {
    const w = this.world; const dx = player.pos.x - m.pos.x, dz = player.pos.z - m.pos.z; const dist = Math.hypot(dx, dz);
    m.attackCd = Math.max(0, m.attackCd - dt); m.hurt = Math.max(0, m.hurt - dt); m.timer -= dt; if (m.flee) m.flee -= dt;
    let wx = 0, wz = 0; const hostile = m.def.hostile && !(m.def.neutralDay && dayLight > 0.5);
    const detect = m.def.cop ? 34 : 20;
    if (hostile && dist < detect && Math.abs(player.pos.y - m.pos.y) < (m.def.cop ? 8 : 6)) {
      if (m.def.cop) {
        if (dist > 8) { wx = dx / dist; wz = dz / dist; }
        if (dist < 24 && m.attackCd <= 0) { m.attackCd = 0.85; this.game.damagePlayer(3 + Math.random() * 3); this.game._tracer(new THREE.Vector3(m.pos.x, m.pos.y + 1.5, m.pos.z), this.game.player.eye(), 0x9fc2ff); }
      } else if (m.def.creeper && dist < 2.2) { m.fuse += dt; if (m.fuse > 1.4) { this._explode(m, player); m.dead = true; this.group.remove(m.group); return; } }
      else if (dist > 1.1) { wx = dx / dist; wz = dz / dist; } else if (m.def.dmg > 0 && m.attackCd <= 0) { this.game.damagePlayer(m.def.dmg); m.attackCd = 1; }
      m.yaw = Math.atan2(dx, dz);
    } else if (m.flee > 0) { wx = -dx / (dist || 1); wz = -dz / (dist || 1); m.yaw = Math.atan2(-dx, -dz); }
    else if (m.npc && m.goto) { const gx = m.goto.x - m.pos.x, gz = m.goto.z - m.pos.z, gd = Math.hypot(gx, gz); if (gd > 1.8) { wx = gx / gd; wz = gz / gd; m.yaw = Math.atan2(gx, gz); } else { m.goto = null; } }
    else { if (m.timer <= 0) { m.timer = 2 + Math.random() * 4; m.wander = Math.random() < 0.4 ? null : Math.random() * 6.28; } if (m.wander != null) { wx = Math.sin(m.wander); wz = Math.cos(m.wander); m.yaw = m.wander; } }
    const moving = wx || wz; const sp = m.def.speed * (m.flee > 0 ? 1.5 : 1);
    if (moving) { m.vel.x += (wx * sp - m.vel.x) * Math.min(1, 8 * dt); m.vel.z += (wz * sp - m.vel.z) * Math.min(1, 8 * dt); } else { m.vel.x *= 0.7; m.vel.z *= 0.7; }
    const inWater = w.getBlock(Math.floor(m.pos.x), Math.floor(m.pos.y + 0.1), Math.floor(m.pos.z)) === B.WATER;
    m.vel.y -= 26 * (inWater ? 0.4 : 1) * dt; if (inWater) { m.vel.y = Math.max(m.vel.y, -2); if (moving) m.vel.y += 6 * dt; } m.vel.y = Math.max(m.vel.y, -50);
    const bx = m.pos.x, bz = m.pos.z; entMove(m, w, dt);
    if (moving && m.onGround && Math.abs(m.pos.x - bx) < Math.abs(m.vel.x * dt) * 0.5 + 1e-4 && Math.abs(m.pos.z - bz) < Math.abs(m.vel.z * dt) * 0.5 + 1e-4) m.vel.y = 7;
    if (m.def.burns && dayLight > 0.8) { const sky = w.getSky(Math.floor(m.pos.x), Math.floor(m.pos.y + m.h), Math.floor(m.pos.z)); if (sky >= 14) { m._b = (m._b || 0) + dt; if (m._b > 1) { m.damage(1, undefined, undefined, this); m._b = 0; } } }
    if (m.pos.y < -24) m.dead = true;
    // models face -Z, so offset by PI to make them walk where they look (no moonwalking)
    m.group.rotation.y = m.yaw + Math.PI;
    const mov = Math.hypot(m.vel.x, m.vel.z);
    if (m.gltf) {
      // real animated glTF model — drive its own walk/idle clips, no fake box motion
      m.group.position.set(m.pos.x, m.pos.y, m.pos.z);
      if (m.mixer) { const a = (moving && m.actions.walk) ? m.actions.walk : m.actions.idle; if (a && m._cur !== a) { if (m._cur) m._cur.fadeOut(0.18); a.reset().fadeIn(0.18).play(); m._cur = a; } if (moving && m.actions.walk) m.actions.walk.timeScale = 0.8 + Math.min(1.4, mov * 0.5); m.mixer.update(dt); }
      return;
    }
    m.phase += dt * (5 + mov * 3);
    // exaggerated leg swing (alternating), idle breathing when still
    const sw = (moving || m.def.floaty) ? Math.sin(m.phase) * 1.0 : Math.sin(m.phase * 0.3) * 0.06;
    m.legs.forEach((l, i) => l.rotation.x = sw * (i % 2 ? -1 : 1));
    // springy body bounce + head bob keyed to the gait
    const bounce = moving ? Math.abs(Math.sin(m.phase)) * 0.09 * Math.min(1, mov) : Math.sin(m.phase * 0.3) * 0.01;
    m.group.position.set(m.pos.x, m.pos.y + bounce, m.pos.z);
    if (m.head) m.head.rotation.x = Math.sin(m.phase) * 0.16 * (moving ? 1 : 0.25) + (m.attackCd > 0.7 ? 0.4 : 0);
    // signature per-type flourishes
    if (m.type === 'slime') { const sq = 1 + Math.sin(m.phase * 1.3) * 0.22; m.group.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq)); }
    else if (m.def.creeper && m.fuse > 0) { const s = 1 + Math.sin(performance.now() * 0.03) * 0.12 * m.fuse; m.group.scale.setScalar(s); }
    else if (m.type === 'enderman') m.group.scale.set(1, 1 + Math.sin(m.phase * 0.4) * 0.03, 1);
    else m.group.scale.setScalar(1);
    this._tint(m.group, w.lightLevelAt ? w.lightLevelAt(m.pos.x, m.pos.y + 1, m.pos.z, dayLight) : 1, m.hurt > 0);
  }
  _explode(m, player) {
    const cx = m.pos.x, cy = m.pos.y + 0.5, cz = m.pos.z, R = 3.2;
    for (let x = -4; x <= 4; x++) for (let y = -4; y <= 4; y++) for (let z = -4; z <= 4; z++) { const d = Math.hypot(x, y, z); if (d > R) continue; const id = this.world.getBlock(Math.floor(cx + x), Math.floor(cy + y), Math.floor(cz + z)); if (id !== B.AIR && id !== B.OBSIDIAN && Math.random() < 1 - d / R) this.world.setBlock(Math.floor(cx + x), Math.floor(cy + y), Math.floor(cz + z), B.AIR); }
    const pd = Math.hypot(player.pos.x - cx, player.pos.y - cy, player.pos.z - cz); if (pd < R + 2) this.game.damagePlayer(Math.max(0, (1 - pd / (R + 2)) * 16));
  }
  _item(it, dt, player) {
    it.age += dt; it.delay -= dt; if (it.age > 180) { it.dead = true; return; }
    it.vel.y -= 26 * dt; entMove(it, this.world, dt); if (it.onGround) { it.vel.x *= 0.6; it.vel.z *= 0.6; }
    const tgt = new THREE.Vector3(player.pos.x, player.pos.y + 0.6, player.pos.z); const d = tgt.distanceTo(it.pos);
    if (it.delay <= 0 && d < 1.8) { if (d < 0.8) { if (it.item === ITEM.CASH) { player.money += it.count; it.dead = true; } else if (this.game.inventory.add(it.item, it.count) === 0) it.dead = true; } else { it.pos.lerp(tgt, Math.min(1, 9 * dt)); it.vel.set(0, 0, 0); } }
    it.group.position.set(it.pos.x, it.pos.y + 0.25 + Math.sin(it.age * 3) * 0.06, it.pos.z); it.group.rotation.y += dt * 2;
  }
  _spawnLoop(dt, player, dayLight) {
    this.spawnT -= dt; if (this.spawnT > 0) return; this.spawnT = 0.9;
    const night = dayLight < 0.35; const wantH = night && this.countH() < this.maxH; const wantP = dayLight > 0.5 && this.countP() < this.maxP;
    if (!wantH && !wantP) return;
    let spawned = 0;
    for (let a = 0; a < 12 && spawned < 2; a++) {
      const ang = Math.random() * 6.28, r = 16 + Math.random() * 26; const wx = Math.floor(player.pos.x + Math.cos(ang) * r), wz = Math.floor(player.pos.z + Math.sin(ang) * r);
      if (!this.world.isLoaded(wx, wz)) continue; const gy = this.world.highestY(wx, wz), sy = gy + 1; if (this.world.getBlock(wx, sy, wz) !== B.AIR) continue;
      const top = this.world.getBlock(wx, gy, wz); const lvl = Math.max(this.world.getBlk(wx, sy, wz), this.world.getSky(wx, sy, wz) * dayLight);
      if (wantH && lvl < 7) { const types = ['zombie', 'zombie', 'skeleton', 'creeper', 'spider', 'enderman', 'slime']; this.spawn(types[Math.random() * types.length | 0], wx + 0.5, sy, wz + 0.5); spawned++; }
      else if (wantP && top === B.GRASS && this.world.getSky(wx, sy, wz) >= 9) { const types = ['cow', 'pig', 'sheep', 'chicken']; const t = types[Math.random() * types.length | 0]; const n = 2 + (Math.random() * 3 | 0); for (let i = 0; i < n; i++) this.spawn(t, wx + 0.5 + (Math.random() - 0.5), sy, wz + 0.5 + (Math.random() - 0.5)); spawned++; }
    }
  }
  // a handful of animals right where the player starts, so the world feels alive immediately
  seedAround(player) {
    let placed = 0;
    for (let a = 0; a < 40 && placed < 4; a++) {
      const ang = Math.random() * 6.28, r = 6 + Math.random() * 12; const wx = Math.floor(player.pos.x + Math.cos(ang) * r), wz = Math.floor(player.pos.z + Math.sin(ang) * r);
      if (!this.world.isLoaded(wx, wz)) continue; const gy = this.world.highestY(wx, wz), sy = gy + 1;
      if (this.world.getBlock(wx, sy, wz) !== B.AIR) continue; const top = this.world.getBlock(wx, gy, wz);
      if (top !== B.GRASS && top !== B.SAND && top !== B.SNOW) continue;
      const t = ['cow', 'pig', 'sheep', 'chicken'][Math.random() * 4 | 0]; const n = 2 + (Math.random() * 2 | 0);
      for (let i = 0; i < n; i++) this.spawn(t, wx + 0.5 + (Math.random() - 0.5), sy, wz + 0.5 + (Math.random() - 0.5));
      placed++;
    }
  }
  rayHit(o, d, reach) { let best = null, bt = reach; for (const m of this.mobs) { const t = rayAABB(o, d, m.aabb()); if (t != null && t < bt) { bt = t; best = m; } } return best; }
  attackRay(o, d, reach, dmg) { const m = this.rayHit(o, d, reach); if (m) { const kb = new THREE.Vector3(d.x, 0, d.z).normalize(); m.damage(dmg, kb.x, kb.z, this); this.hitFx(m.pos.x, m.pos.y + m.h * 0.6, m.pos.z, m.npc ? 0xb01010 : 0x884422, 8); if (m.npc) { this.game.addWanted(m.def.cop ? 1 : 2); this.alarm(m.pos.x, m.pos.z, 18); } return true; } return false; }
  clear() { for (const m of this.mobs) this.group.remove(m.group); for (const it of this.items) this.group.remove(it.group); for (const c of this.cars) this.group.remove(c.group); for (const p of this.planes) this.group.remove(p.group); for (const f of this.fx) this.group.remove(f.mesh); this.mobs = []; this.items = []; this.cars = []; this.planes = []; this.fx = []; }
}
function rayAABB(o, d, b) { let tmin = 0, tmax = Infinity; for (const ax of ['x', 'y', 'z']) { const lo = b['min' + ax.toUpperCase()], hi = b['max' + ax.toUpperCase()]; if (Math.abs(d[ax]) < 1e-8) { if (o[ax] < lo || o[ax] > hi) return null; } else { let t1 = (lo - o[ax]) / d[ax], t2 = (hi - o[ax]) / d[ax]; if (t1 > t2) { const t = t1; t1 = t2; t2 = t; } tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) return null; } } return tmin; }

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
class Input {
  constructor(canvas) {
    this.canvas = canvas; this.keys = new Set(); this.pressed = new Set();
    this.mdx = 0; this.mdy = 0; this.locked = false;
    this.mL = false; this.mR = false; this.mLe = false; this.mRe = false; this.wheel = 0;
    addEventListener('keydown', e => { const ae = document.activeElement; if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) return; if (!e.repeat) { this.keys.add(e.code); this.pressed.add(e.code); } if (this.locked && ['Space', 'Tab'].includes(e.code)) e.preventDefault(); });
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
// life stages: you're born a baby and grow up
const STAGES = [
  { name: 'Baby', ph: 0.72, eyeH: 0.55, hw: 0.22, reach: 2.8, speedMul: 0.55, arm: 0.55, dur: 50 },
  { name: 'Child', ph: 1.15, eyeH: 0.98, hw: 0.26, reach: 3.7, speedMul: 0.78, arm: 0.78, dur: 75 },
  { name: 'Teen', ph: 1.5, eyeH: 1.32, hw: 0.28, reach: 4.5, speedMul: 0.92, arm: 0.9, dur: 95 },
  { name: 'Adult', ph: 1.8, eyeH: 1.62, hw: 0.3, reach: 5.0, speedMul: 1.0, arm: 1.0, dur: Infinity },
];
class Player {
  constructor(game) {
    this.game = game; this.camera = game.camera; this.world = game.world;
    this.pos = new THREE.Vector3(8, 60, 8); this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0; this.onGround = false; this.fly = false; this._lastSpace = 0;
    this.target = null; this.breakTarget = null; this.breakProgress = 0; this.mineCd = 0;
    this.health = 20; this.hunger = 20; this.sat = 5; this.exhaustion = 0; this.dead = false;
    this.invuln = 0; this.regenT = 0; this.fallStart = null; this.sprinting = false;
    this.gunCd = 0; this.reloadT = 0; this.recoil = 0; this.money = 50;
    this.wanted = 0; this.heat = 0; this.vehicle = null;
    this.stage = 0; this.ageT = 0; this._applyStage(0);
  }
  _applyStage(s) { this.stage = s; const st = STAGES[s]; this.ph = st.ph; this.eyeH = st.eyeH; this.hw = st.hw; this.reach = st.reach; this.speedMul = st.speedMul; if (this.game.hand) this.game.hand.scale.setScalar(st.arm); }
  growthTick(dt) {
    this.ageT += dt; let acc = 0;
    for (let s = 0; s < STAGES.length; s++) { acc += STAGES[s].dur; if (this.ageT < acc || s === STAGES.length - 1) { if (s !== this.stage) this._applyStage(s); break; } }
  }
  enterVehicle(v) { this.vehicle = v; v.driver = this; if (v.kind === 'car') { v.driveSpeed = v.driveSpeed || 0; this.game.addWanted(1); } this.game.hand.visible = false; }
  exitVehicle() { const v = this.vehicle; if (!v) return; this.vehicle = null; v.driver = null; this.pos.set(v.pos.x + 1.8, (v.kind === 'plane' ? this.world.highestY(Math.floor(v.pos.x), Math.floor(v.pos.z)) + 1 : v.pos.y + 0.5), v.pos.z); this.vel.set(0, 0, 0); if (v.kind === 'plane') this.game.mobs.removePlane(v); }
  _vehicle(dt, input) {
    const v = this.vehicle; const world = this.world;
    if (v.kind === 'car') {
      const steer = (input.k('KeyA') ? 1 : 0) - (input.k('KeyD') ? 1 : 0);
      const accel = (input.k('KeyW') ? 1 : 0) - (input.k('KeyS') ? 1 : 0);
      v.driveSpeed += accel * 17 * dt; v.driveSpeed *= (input.k('Space') ? 0.9 : 0.99); v.driveSpeed = clamp(v.driveSpeed, -9, 22);
      if (Math.abs(v.driveSpeed) > 0.4) v.yaw += steer * 1.7 * dt * (v.driveSpeed > 0 ? 1 : -1);
      const dirx = Math.sin(v.yaw), dirz = Math.cos(v.yaw);
      const nx = v.pos.x + dirx * v.driveSpeed * dt, nz = v.pos.z + dirz * v.driveSpeed * dt;
      const gy = world.highestY(Math.floor(nx), Math.floor(nz));
      if (gy <= v.pos.y + 1.3) { v.pos.x = nx; v.pos.z = nz; v.pos.y += (gy + 1 - v.pos.y) * Math.min(1, dt * 8); } else { v.driveSpeed *= -0.25; }
      if (Math.abs(v.driveSpeed) > 5) for (const m of this.game.mobs.mobs) { if (Math.abs(m.pos.y - v.pos.y) < 2.2 && Math.hypot(m.pos.x - v.pos.x, m.pos.z - v.pos.z) < 2.4) { m.damage(24, dirx, dirz, this.game.mobs); if (m.npc && !m.def.cop) this.game.addWanted(2); } }
      v.group.position.set(v.pos.x, v.pos.y + 0.2, v.pos.z); v.group.rotation.y = v.yaw;
      this.pos.set(v.pos.x, v.pos.y, v.pos.z); this.vel.set(0, 0, 0);
    } else { // plane — arcade flight
      this.yaw -= input.mdx * 0.0022; this.pitch -= input.mdy * 0.0022; this.pitch = clamp(this.pitch, -1.2, 1.2);
      const roll = (input.k('KeyA') ? 1 : 0) - (input.k('KeyD') ? 1 : 0); v.roll = v.roll * 0.92 + roll * 0.5 * 0.5;
      v.throttle = clamp(v.throttle + ((input.k('KeyW') ? 1 : 0) - (input.k('KeyS') ? 1 : 0)) * dt * 0.7, 0, 1);
      const speed = 7 + v.throttle * 60;
      const cp = Math.cos(this.pitch), fx = Math.sin(this.yaw) * cp, fy = Math.sin(this.pitch), fz = Math.cos(this.yaw) * cp;
      v.pos.x += fx * speed * dt; v.pos.y += fy * speed * dt; v.pos.z += fz * speed * dt; v.pos.y -= (1 - v.throttle) * 7 * dt;
      const gy = world.highestY(Math.floor(v.pos.x), Math.floor(v.pos.z));
      if (v.pos.y < gy + 2) { v.pos.y = gy + 2; if (speed > 24) this.takeDamage(5); }
      v.group.position.copy(v.pos); v.group.rotation.set(-this.pitch, this.yaw, v.roll, 'YXZ');
      this.pos.set(v.pos.x, v.pos.y - 1, v.pos.z); this.vel.set(0, 0, 0);
    }
    this.updateStats(dt);
  }
  eye() { return new THREE.Vector3(this.pos.x, this.pos.y + this.eyeH, this.pos.z); }
  update(dt, input) {
    dt = Math.min(dt, 0.05);
    if (this.vehicle) { this._vehicle(dt, input); return; }
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
      const onIce = this.onGround && this.world.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y - 0.08), Math.floor(this.pos.z)) === B.ICE;
      const sp = (this.sprinting ? 5.8 : 4.4) * (inWater ? 0.6 : 1) * (onIce ? 1.15 : 1) * this.speedMul;
      const accel = onIce ? 2.4 : 12;
      this.vel.x += (wish.x * sp - this.vel.x) * Math.min(1, accel * dt);
      this.vel.z += (wish.z * sp - this.vel.z) * Math.min(1, accel * dt);
      this.vel.y -= (inWater ? 10 : 28) * dt; this.vel.y = Math.max(this.vel.y, inWater ? -3 : -56);
      if (input.k('Space')) { if (this.onGround) { this.vel.y = 8.4; } else if (inWater) this.vel.y = 4; }
      this.move(dt);
      this._fall(dt);
    }
    if (this.pos.y < -24) { if (!creative) this.takeDamage(6); this.pos.set(this.pos.x, 90, this.pos.z); this.vel.set(0, 0, 0); }
    this.camera.position.copy(this.eye());
    this.updateStats(dt); this.growthTick(dt);

    this.target = this.raycast(Math.max(5, this.reach));
    this.swing = Math.max(0, (this.swing || 0) - dt * 5);
    if (!this.game.ui.open && !this.dead) {
      const heldItem = this.game.inventory.held(); const hd = heldItem ? itemDef(heldItem.id) : null;
      if (hd && hd.gun) {
        this.breakTarget = null; this.breakProgress = 0;
        this._gun(dt, input, heldItem, hd);
      } else {
        const dir = new THREE.Vector3(); this.camera.getWorldDirection(dir);
        const reach = Math.max(3.5, this.reach - 0.6);
        const mobAim = this.game.mobs ? this.game.mobs.rayHit(this.eye(), dir, reach) : null;
        const talkable = mobAim && mobAim.type === 'npc';
        if (mobAim) {
          this.breakTarget = null; this.breakProgress = 0;
          if (talkable && input.mRe) { this.game.ui.openChat(mobAim); }
          else if (!talkable && input.mLe) { const h = this.game.inventory.held(); const d = h ? itemDef(h.id) : null; const dmg = d && d.melee ? d.dmg : (d && d.tool === 'sword' ? 4 + (d.tier || 0) : (d && d.tool ? 2 : 1)); this.game.mobs.attackRay(this.eye(), dir, reach, dmg); this.swing = 1; }
        } else this._mine(dt, input);
        if (input.mLe && !mobAim) this.swing = 1;
        if (input.mRe && this.target && !talkable) { this._use(input); this.swing = 1; }
      }
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
  takeDamage(n) { if (this.game.mode === 'creative' || this.dead || this.invuln > 0) return; const def = this.game.inventory.defense(); n = n * (1 - Math.min(0.8, def * 0.04)); this.health -= n; this.invuln = 0.5; this.game.onHurt(); if (this.health <= 0) { this.health = 0; this.dead = true; this.game.onDeath(); } }
  _gun(dt, input, slot, d) {
    this.gunCd = Math.max(0, this.gunCd - dt);
    if (slot.ammo == null) slot.ammo = d.clip;
    if (this.reloadT > 0) { this.reloadT -= dt; if (this.reloadT <= 0) slot.ammo = d.clip; return; }
    if (input.p('KeyR') && slot.ammo < d.clip) { this.reloadT = d.reload; return; }
    const wantFire = d.auto ? input.mL : input.mLe;
    if (wantFire && this.gunCd <= 0) {
      if (slot.ammo <= 0) { this.reloadT = d.reload; return; }
      this.gunCd = d.cd;
      if (this.game.mode !== 'creative') slot.ammo--;
      this.game.fireGun(this, d);
    }
  }
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
      const cx = t.x + 0.5, cy = t.y + 0.3, cz = t.z + 0.5;
      if (give != null) this.game.mobs.dropItem(cx, cy, cz, give, surv(t.id).count || 1);
      const sv = surv(t.id); if (sv.apple && Math.random() < sv.apple) this.game.mobs.dropItem(cx, cy, cz, ITEM.APPLE, 1);
      this.exhaustion += 0.05; this.breakProgress = 0; this.breakTarget = null;
    }
  }
  _use(input) {
    const t = this.target;
    if (t && t.id === B.CRAFTING_TABLE && !input.k('ShiftLeft')) { this.game.ui.openTable(); return; }
    const held = this.game.inventory.held(); if (!held) return;
    const d = itemDef(held.id);
    if (d.food && this.hunger < 20) { this.hunger = Math.min(20, this.hunger + d.food); this.sat = Math.min(this.hunger, this.sat + d.food * 0.6); this.ageT += 6; if (this.game.mode !== 'creative') this.game.inventory.consumeSel(1); return; }
    if (d.isBlock) this.place(held.id);
  }
  move(dt) {
    this.onGround = false;
    this.axis(0, this.vel.x * dt); this.axis(1, this.vel.y * dt); this.axis(2, this.vel.z * dt);
  }
  solid(x, y, z) { const id = this.world.getBlock(x, y, z); return id !== B.AIR && blockDef(id).solid; }
  axis(a, amt) {
    if (amt === 0) return; const p = this.pos; const comp = ['x', 'y', 'z'][a]; p[comp] += amt;
    const HW = this.hw, PH = this.ph;
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
    if (d.solid) { const HW = this.hw, PH = this.ph; const minX = this.pos.x - HW, maxX = this.pos.x + HW, minY = this.pos.y, maxY = this.pos.y + PH, minZ = this.pos.z - HW, maxZ = this.pos.z + HW; if (px + 1 > minX && px < maxX && py + 1 > minY && py < maxY && pz + 1 > minZ && pz < maxZ) return; }
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
  constructor(game) { this.game = game; this.iconCache = new Map(); this.canvasCache = new Map(); this.open = null; this.build(); }
  iconCanvas(id) { this.itemIcon(id); return this.canvasCache.get(id); }
  blockIcon(id) {
    if (this.iconCache.has(id)) return this.iconCache.get(id);
    const d = blockDef(id); const g = this.game;
    const c = document.createElement('canvas'); c.width = c.height = 32; const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
    const face = (name, dxs) => { const uv = g.uv.get(name); if (!uv) return; ctx.drawImage(g.atlas, uv[0] * g.atlas.width, uv[1] * g.atlas.height, (uv[2] - uv[0]) * g.atlas.width, (uv[3] - uv[1]) * g.atlas.height, dxs[0], dxs[1], dxs[2], dxs[3]); };
    face(texOf(d, 2), [0, 0, 32, 14]); face(texOf(d, 4), [0, 12, 32, 20]);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, 12, 32, 20);
    const url = c.toDataURL(); this.iconCache.set(id, url); this.canvasCache.set(id, c); return url;
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
    else if (id === ITEM.LEATHER) { x.fillStyle = '#8a5a32'; x.fillRect(7, 8, 18, 16); x.fillStyle = '#6e4626'; x.fillRect(7, 8, 18, 3); }
    else if (id === ITEM.BEEF) { x.fillStyle = '#7a4a3a'; x.beginPath(); x.arc(16, 16, 9, 0, 7); x.fill(); x.fillStyle = '#a9654f'; x.fillRect(10, 11, 5, 4); }
    else if (id === ITEM.PORK) { x.fillStyle = '#c98a76'; x.beginPath(); x.arc(16, 16, 9, 0, 7); x.fill(); x.fillStyle = '#e0e0d0'; x.fillRect(20, 18, 5, 4); }
    else if (id === ITEM.MUTTON) { x.fillStyle = '#9a5a4a'; x.beginPath(); x.arc(16, 16, 9, 0, 7); x.fill(); }
    else if (id === ITEM.CHICKEN_F) { x.fillStyle = '#caa06a'; x.beginPath(); x.arc(14, 16, 8, 0, 7); x.fill(); x.fillStyle = '#efe2c0'; x.fillRect(20, 12, 5, 3); }
    else if (id === ITEM.BONE) { x.strokeStyle = '#ece9da'; x.lineWidth = 4; x.beginPath(); x.moveTo(9, 24); x.lineTo(23, 8); x.stroke(); x.fillStyle = '#ece9da'; x.beginPath(); x.arc(8, 25, 3, 0, 7); x.arc(24, 7, 3, 0, 7); x.fill(); }
    else if (id === ITEM.STRING) { x.strokeStyle = '#e8e8e8'; x.lineWidth = 2; x.beginPath(); for (let a = 0; a < 6; a++) x.lineTo(8 + (a % 2) * 14, 6 + a * 4); x.stroke(); }
    else if (id === ITEM.GUNPOWDER) { x.fillStyle = '#4a4a4e'; for (let i = 0; i < 9; i++) x.fillRect(7 + (i % 3) * 6, 8 + ((i / 3) | 0) * 6, 4, 4); }
    else if (id === ITEM.FEATHER) { x.strokeStyle = '#f0f0f5'; x.lineWidth = 3; x.beginPath(); x.moveTo(22, 7); x.lineTo(9, 24); x.stroke(); }
    else if (id === ITEM.ROTTEN) { x.fillStyle = '#7a6a4a'; x.beginPath(); x.arc(16, 16, 9, 0, 7); x.fill(); }
    else if (id === ITEM.PEARL) { x.fillStyle = '#1c7a6e'; x.beginPath(); x.arc(16, 16, 9, 0, 7); x.fill(); x.fillStyle = '#7fffe6'; x.beginPath(); x.arc(13, 13, 3, 0, 7); x.fill(); }
    else if (id === ITEM.GOLD_NUGGET) { x.fillStyle = '#e7c65a'; x.beginPath(); x.arc(16, 16, 6, 0, 7); x.fill(); }
    else if (id === ITEM.EMERALD) { x.fillStyle = '#2ec85a'; x.beginPath(); x.moveTo(16, 5); x.lineTo(25, 13); x.lineTo(20, 27); x.lineTo(12, 27); x.lineTo(7, 13); x.closePath(); x.fill(); x.fillStyle = '#9affc0'; x.fillRect(13, 10, 3, 8); }
    else if (id === ITEM.REDSTONE) { x.fillStyle = '#d22'; for (let i = 0; i < 7; i++) x.fillRect(6 + (i % 3) * 7, 7 + ((i / 3) | 0) * 7, 4, 4); }
    else if (id === ITEM.CASH) { x.fillStyle = '#3a7d44'; x.fillRect(5, 10, 22, 12); x.fillStyle = '#bfe6c2'; x.beginPath(); x.arc(16, 16, 4, 0, 7); x.fill(); x.fillStyle = '#2a5a33'; x.font = 'bold 8px sans-serif'; x.fillText('$', 14, 19); }
    else if (id === ITEM.KNIFE) { x.strokeStyle = '#2a2a2e'; x.lineWidth = 4; x.beginPath(); x.moveTo(9, 25); x.lineTo(14, 20); x.stroke(); x.fillStyle = '#d8dce2'; x.beginPath(); x.moveTo(14, 20); x.lineTo(25, 7); x.lineTo(27, 11); x.lineTo(17, 23); x.closePath(); x.fill(); }
    else if (id === ITEM.BAT) { x.strokeStyle = '#b07a3a'; x.lineWidth = 6; x.lineCap = 'round'; x.beginPath(); x.moveTo(9, 25); x.lineTo(24, 8); x.stroke(); x.lineWidth = 3; x.strokeStyle = '#8a5a2e'; x.beginPath(); x.moveTo(8, 26); x.lineTo(12, 22); x.stroke(); }
    else if (d.armor) {
      const col = '#' + (d.acol || 0x999999).toString(16).padStart(6, '0'); x.fillStyle = col; x.strokeStyle = 'rgba(0,0,0,0.4)'; x.lineWidth = 1;
      if (d.slot === 0) { x.beginPath(); x.arc(16, 16, 9, Math.PI, 0); x.lineTo(25, 22); x.lineTo(7, 22); x.closePath(); x.fill(); x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(12, 16, 8, 5); }
      else if (d.slot === 1) { x.fillRect(8, 7, 16, 17); x.fillRect(4, 7, 5, 9); x.fillRect(23, 7, 5, 9); x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(10, 9, 3, 12); }
      else if (d.slot === 2) { x.fillRect(8, 6, 16, 8); x.fillRect(8, 14, 6, 12); x.fillRect(18, 14, 6, 12); }
      else { x.fillRect(7, 12, 8, 13); x.fillRect(17, 12, 8, 13); }
    }
    else if (d.gun) {
      x.fillStyle = '#22252b'; x.strokeStyle = '#0c0d10';
      if (id === ITEM.PISTOL) { x.fillRect(7, 11, 17, 6); x.fillRect(19, 16, 6, 9); }
      else if (id === ITEM.SMG) { x.fillRect(5, 10, 22, 6); x.fillRect(16, 15, 5, 9); x.fillRect(8, 8, 6, 3); }
      else if (id === ITEM.RIFLE) { x.fillRect(3, 11, 26, 5); x.fillRect(18, 15, 5, 8); x.fillStyle = '#6b4a2a'; x.fillRect(24, 11, 6, 5); x.fillStyle = '#22252b'; x.fillRect(10, 8, 5, 4); }
      else if (id === ITEM.SHOTGUN) { x.fillRect(3, 11, 22, 6); x.fillStyle = '#6b4a2a'; x.fillRect(23, 11, 7, 7); x.fillStyle = '#22252b'; x.fillRect(15, 16, 5, 6); }
      else if (id === ITEM.SNIPER) { x.fillRect(2, 12, 28, 4); x.fillRect(11, 8, 9, 3); x.fillStyle = '#6b4a2a'; x.fillRect(24, 12, 6, 6); x.fillStyle = '#22252b'; x.fillRect(17, 16, 4, 7); }
    }
    else { x.fillStyle = '#c0c'; x.fillRect(8, 8, 16, 16); }
    const url = c.toDataURL(); this.iconCache.set(id, url); this.canvasCache.set(id, c); return url;
  }
  build() {
    const root = document.createElement('div'); root.id = 'ui';
    root.innerHTML = `<div id="cross"><div id="breakbar"></div></div>
      <div id="stats"><div id="hearts" class="pips"></div><div id="hungers" class="pips"></div></div>
      <div id="hotbar"></div><div id="selname"></div><div id="ammo" class="hidden"></div><div id="money"></div><div id="wanted"></div><div id="stage"></div><div id="objective"></div><div id="missiontitle" style="opacity:0"></div>
      <div id="hint">WASD · mouse · L/R break/place · F vehicle · P plane · G mug · R reload · E inv · Esc menu</div>
      <div id="screen" class="hidden"></div><div id="cursor" class="hidden"></div><div id="menu" class="hidden"></div>`;
    document.body.appendChild(root); this.root = root;
    this.el = { hotbar: root.querySelector('#hotbar'), hearts: root.querySelector('#hearts'), hungers: root.querySelector('#hungers'), selname: root.querySelector('#selname'), ammo: root.querySelector('#ammo'), money: root.querySelector('#money'), wanted: root.querySelector('#wanted'), stage: root.querySelector('#stage'), objective: root.querySelector('#objective'), missiontitle: root.querySelector('#missiontitle'), screen: root.querySelector('#screen'), cursor: root.querySelector('#cursor'), menu: root.querySelector('#menu'), breakbar: root.querySelector('#breakbar') };
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
    const sd = sit ? itemDef(sit.id) : null;
    if (sd && sd.gun) { const ammo = sit.ammo == null ? sd.clip : sit.ammo; this.el.ammo.classList.remove('hidden'); this.el.ammo.textContent = p.reloadT > 0 ? 'RELOADING…' : ammo + ' / ' + sd.clip; }
    else this.el.ammo.classList.add('hidden');
    this.el.money.textContent = '$' + (p.money | 0);
    this.el.wanted.textContent = p.wanted > 0 ? '★'.repeat(p.wanted) : '';
    this.el.stage.textContent = STAGES[p.stage] ? STAGES[p.stage].name : '';
    this.el.breakbar.style.width = (p.breakProgress > 0 ? p.breakProgress * 22 : 0) + 'px';
    if (this.open === 'inv' || this.open === 'craft') this._renderScreen();
    this._moveCursor();
  }
  _moveCursor() {
    const cur = this.game.inventory.cursor;
    const sc = this.open === 'inv' || this.open === 'craft' || this.open === 'palette';
    if (cur && sc) { this.el.cursor.classList.remove('hidden'); this.el.cursor.style.left = this._mx + 'px'; this.el.cursor.style.top = this._my + 'px'; this.el.cursor.style.backgroundImage = `url(${this.itemIcon(cur.id)})`; this.el.cursor.dataset.c = cur.count > 1 ? cur.count : ''; }
    else { this.el.cursor.classList.add('hidden'); this.el.cursor.style.backgroundImage = ''; this.el.cursor.dataset.c = ''; }
  }
  openInventory() { if (this.game.mode === 'creative') this.openPalette(); else { this.open = 'inv'; this.game.inventory.craftSize = 2; this._showScreen(); } }
  openTable() { this.open = 'craft'; this.game.inventory.craftSize = 3; this._showScreen(); }
  openChat(mob) {
    this.open = 'chat'; this.chatNpc = mob; const p = mob.npc; this.game.input.unlock();
    const s = this.el.screen; s.classList.remove('hidden');
    s.innerHTML = `<div class="panel chatpanel">
      <div class="chathead"><b>${p.first} ${p.last}</b> · ${p.job} · <span class="cls">${p.cls} class</span> · $${p.money} · age ${p.age}</div>
      <div class="chatlog" id="chatlog"></div>
      <div class="chatrow"><input id="chatin" autocomplete="off" spellcheck="false" placeholder="Say something…  (Enter to send · Esc to leave)"/><button id="chatsend">Send</button></div>
      <div class="chathint">Try: their job · money · the city · directions · their hobby · how they're doing</div></div>`;
    this._chatLog = s.querySelector('#chatlog');
    const inp = s.querySelector('#chatin');
    this._appendChat(p.first, npcReply(p, 'hello'), 'npc');
    const send = () => { const v = inp.value.trim(); if (!v) return; this._appendChat('You', v, 'you'); inp.value = ''; const r = npcReply(p, v); setTimeout(() => this._appendChat(p.first, r, 'npc'), 130); };
    s.querySelector('#chatsend').onclick = send;
    inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') send(); else if (e.key === 'Escape') this.close(); });
    setTimeout(() => inp.focus(), 30);
  }
  _appendChat(who, text, cls) {
    if (!this._chatLog) return; const d = document.createElement('div'); d.className = 'cmsg ' + cls;
    d.innerHTML = '<b>' + who + ':</b> ' + String(text).replace(/</g, '&lt;'); this._chatLog.appendChild(d); this._chatLog.scrollTop = this._chatLog.scrollHeight;
  }
  openPalette() {
    this.open = 'palette'; this.game.input.unlock(); const s = this.el.screen; s.classList.remove('hidden'); s.innerHTML = '<div class="panel"><h3>Creative Blocks</h3><div class="pg"></div></div>';
    const grid = s.querySelector('.pg');
    const all = ALL_PLACEABLE.concat([ITEM.W_PICK, ITEM.S_PICK, ITEM.I_PICK, ITEM.D_PICK, ITEM.D_SWORD, ITEM.D_AXE, ITEM.APPLE, ITEM.COAL, ITEM.IRON, ITEM.DIAMOND,
      ITEM.L_HELM, ITEM.L_CHEST, ITEM.L_LEGS, ITEM.L_BOOTS, ITEM.I_HELM, ITEM.I_CHEST, ITEM.I_LEGS, ITEM.I_BOOTS, ITEM.D_HELM, ITEM.D_CHEST, ITEM.D_LEGS, ITEM.D_BOOTS,
      ITEM.KNIFE, ITEM.BAT, ITEM.PISTOL, ITEM.SMG, ITEM.RIFLE, ITEM.SHOTGUN, ITEM.SNIPER]);
    for (const id of all) { const b = document.createElement('div'); b.className = 'pi'; b.style.backgroundImage = `url(${this.itemIcon(id)})`; b.title = itemDef(id).name; b.onclick = () => { const iv = this.game.inventory; iv.slots[iv.sel] = { id, count: itemDef(id).stack || 1 }; this.close(); }; grid.appendChild(b); }
  }
  _showScreen() { this.game.input.unlock(); this.el.screen.classList.remove('hidden'); this._renderScreen(); }
  close() {
    if (this.open === 'inv' || this.open === 'craft') { const iv = this.game.inventory; for (let i = 0; i < iv.craft.length; i++) if (iv.craft[i]) { iv.add(iv.craft[i].id, iv.craft[i].count); iv.craft[i] = null; } if (iv.cursor) { iv.add(iv.cursor.id, iv.cursor.count); iv.cursor = null; } }
    this.open = null; this.chatNpc = null; this._chatLog = null; this.el.screen.classList.add('hidden'); this.el.cursor.classList.add('hidden');
    if (this.game.playing && !this.game.paused) this.game.input.lock();
  }
  _slot(get, set, opts = {}) {
    const el = document.createElement('div'); el.className = 'islot' + (opts.cls ? ' ' + opts.cls : '');
    if (opts.title) el.title = opts.title;
    const it = get(); if (it) { el.style.backgroundImage = `url(${this.itemIcon(it.id)})`; if (it.count > 1) el.dataset.c = it.count; }
    el.addEventListener('mousedown', e => { e.preventDefault(); opts.out ? this._takeOutput(opts) : this._click(get, set, e.button, opts); });
    return el;
  }
  _click(get, set, btn, opts = {}) {
    const iv = this.game.inventory; let cur = iv.cursor, s = get();
    // armor slots only accept matching pieces being placed
    if (opts.accept && cur && !opts.accept(cur.id)) { if (!(s && !cur)) return; }
    if (btn === 2) {
      if (cur) { if (!s) { set({ id: cur.id, count: 1 }); cur.count--; } else if (s.id === cur.id && s.count < maxStack(s.id)) { s.count++; cur.count--; set(s); } if (cur.count <= 0) iv.cursor = null; }
      else if (s) { const h = Math.ceil(s.count / 2); iv.cursor = { id: s.id, count: h }; s.count -= h; set(s.count > 0 ? s : null); }
    } else {
      if (!cur && s) { iv.cursor = s; set(null); }
      else if (cur && !s) { set(cur); iv.cursor = null; }
      else if (cur && s) { if (s.id === cur.id) { const m = maxStack(s.id), mv = Math.min(cur.count, m - s.count); s.count += mv; cur.count -= mv; set(s); if (cur.count <= 0) iv.cursor = null; } else { iv.cursor = s; set(cur); } }
    }
    if (iv.cursor && iv.cursor.count <= 0) iv.cursor = null; // safety: never leave a 0-count ghost
    this._renderScreen(); this._moveCursor();
  }
  _takeOutput(opts) {
    const iv = this.game.inventory; const res = craftMatch(iv.craft.slice(0, opts.size * opts.size), opts.size);
    if (!res) return; if (iv.cursor && (iv.cursor.id !== res.id || iv.cursor.count + res.count > maxStack(res.id))) return;
    if (iv.cursor) iv.cursor.count += res.count; else iv.cursor = { id: res.id, count: res.count };
    for (let i = 0; i < opts.size * opts.size; i++) { const s = iv.craft[i]; if (s) { s.count--; if (s.count <= 0) iv.craft[i] = null; } }
    this._renderScreen(); this._moveCursor();
  }
  _renderScreen() {
    const iv = this.game.inventory, sz = iv.craftSize; const s = this.el.screen; s.innerHTML = '';
    const panel = document.createElement('div'); panel.className = 'panel';
    panel.innerHTML = `<h3>${sz === 3 ? 'Crafting Table' : 'Inventory'}</h3>`;
    // top row: [character + armor] (inventory only) then crafting grid
    const top = document.createElement('div'); top.className = 'invtop';
    if (sz === 2) {
      const gear = document.createElement('div'); gear.className = 'gear';
      const armorCol = document.createElement('div'); armorCol.className = 'armorcol';
      const SLOTNAMES = ['Helmet', 'Chestplate', 'Leggings', 'Boots'];
      for (let i = 0; i < 4; i++) armorCol.appendChild(this._slot(() => iv.armor[i], v => iv.armor[i] = v, { accept: (id) => { const dd = itemDef(id); return dd && dd.armor && dd.slot === i; }, cls: 'armorslot', title: SLOTNAMES[i] }));
      const preview = document.createElement('canvas'); preview.className = 'skin'; preview.width = 64; preview.height = 112;
      this.drawPlayer(preview);
      gear.appendChild(armorCol); gear.appendChild(preview); top.appendChild(gear);
    }
    const craftWrap = document.createElement('div'); craftWrap.className = 'craftwrap';
    const cg = document.createElement('div'); cg.className = 'grid'; cg.style.gridTemplateColumns = `repeat(${sz},1fr)`;
    for (let i = 0; i < sz * sz; i++) cg.appendChild(this._slot(() => iv.craft[i], v => iv.craft[i] = v));
    const arrow = document.createElement('div'); arrow.className = 'arrow';
    const res = craftMatch(iv.craft.slice(0, sz * sz), sz);
    const out = this._slot(() => res ? { id: res.id, count: res.count } : null, () => {}, { out: true, size: sz, cls: 'out' });
    craftWrap.appendChild(cg); craftWrap.appendChild(arrow); craftWrap.appendChild(out);
    top.appendChild(craftWrap); panel.appendChild(top);
    const main = document.createElement('div'); main.className = 'grid'; main.style.gridTemplateColumns = 'repeat(9,1fr)'; main.style.marginTop = '10px';
    for (let i = 9; i < 36; i++) main.appendChild(this._slot(() => iv.slots[i], v => iv.slots[i] = v));
    panel.appendChild(main);
    const hb = document.createElement('div'); hb.className = 'grid hotrow'; hb.style.gridTemplateColumns = 'repeat(9,1fr)';
    for (let i = 0; i < 9; i++) hb.appendChild(this._slot(() => iv.slots[i], v => iv.slots[i] = v));
    panel.appendChild(hb);
    s.appendChild(panel);
  }
  drawPlayer(canvas) {
    const x = canvas.getContext('2d'); x.clearRect(0, 0, canvas.width, canvas.height); x.imageSmoothingEnabled = false;
    const iv = this.game.inventory; const skin = '#e7b58a', shirt = '#3f7cb4', pants = '#3a4a8a';
    const acol = i => iv.armor[i] ? '#' + (itemDef(iv.armor[i].id).acol || 0x999999).toString(16).padStart(6, '0') : null;
    // body (simple Steve paperdoll, centered)
    x.fillStyle = skin; x.fillRect(22, 6, 20, 18);                 // head
    x.fillStyle = shirt; x.fillRect(20, 26, 24, 26);              // torso
    x.fillStyle = skin; x.fillRect(10, 26, 9, 24); x.fillRect(45, 26, 9, 24); // arms
    x.fillStyle = pants; x.fillRect(22, 54, 9, 26); x.fillRect(33, 54, 9, 26); // legs
    x.fillStyle = skin; x.fillRect(24, 80, 7, 6); x.fillRect(33, 80, 7, 6);   // feet
    // eyes
    x.fillStyle = '#27313b'; x.fillRect(27, 14, 3, 3); x.fillRect(34, 14, 3, 3);
    // armor overlays
    const helm = acol(0); if (helm) { x.globalAlpha = 0.92; x.fillStyle = helm; x.fillRect(20, 4, 24, 12); x.globalAlpha = 1; }
    const chest = acol(1); if (chest) { x.globalAlpha = 0.92; x.fillStyle = chest; x.fillRect(18, 25, 28, 22); x.fillRect(9, 26, 10, 14); x.fillRect(45, 26, 10, 14); x.globalAlpha = 1; }
    const legs = acol(2); if (legs) { x.globalAlpha = 0.92; x.fillStyle = legs; x.fillRect(21, 53, 11, 18); x.fillRect(32, 53, 11, 18); x.globalAlpha = 1; }
    const boots = acol(3); if (boots) { x.globalAlpha = 0.95; x.fillStyle = boots; x.fillRect(22, 76, 10, 10); x.fillRect(32, 76, 10, 10); x.globalAlpha = 1; }
  }
  showMenu(which) {
    this.open = which ? 'menu' : (this.open === 'menu' ? null : this.open);
    const m = this.el.menu; if (!which) { m.classList.add('hidden'); return; }
    this.el.cursor.classList.add('hidden'); this.el.cursor.style.backgroundImage = '';
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
    // real lighting for the (non-terrain) entity meshes — gives form to people, cars, etc.
    this.hemi = new THREE.HemisphereLight(0xbfe3ff, 0x55585e, 0.9); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff2d8, 1.1); this.sun.position.set(40, 80, 20); this.scene.add(this.sun);
    this.weather = new Weather(this.scene);

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
    loadModels(() => { if (this.mobs) this.mobs.upgradeNpcModels(); }); // pulls CC0 character model (online), falls back to built-in
    this.ui.showMenu('start');
    this.loop();
  }
  makeHand() {
    this.hand = new THREE.Group(); this.camera.add(this.hand);
    // a proper Minecraft-style first-person arm: skin forearm reaching up into
    // view from the lower-right, with a blue shirt-sleeve cuff near the camera.
    const arm = new THREE.Group();
    const skin = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.55, 4, 10), new THREE.MeshLambertMaterial({ color: 0xe7b58a }));
    skin.rotation.x = Math.PI / 2; skin.position.z = -0.28; arm.add(skin); this.arm = skin;
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.34, 12), new THREE.MeshLambertMaterial({ color: 0x3f7cb4 }));
    sleeve.rotation.x = Math.PI / 2; sleeve.position.set(0, 0, 0.16); arm.add(sleeve); this.sleeve = sleeve;
    arm.position.set(0.6, -0.66, -0.32); arm.rotation.set(0.6, -0.24, 0.16);
    this.hand.add(arm); this.armMesh = arm;
    this.heldGroup = new THREE.Group(); this.hand.add(this.heldGroup); this.heldId = -2;
    // muzzle flash (for guns) — a small bright billboard at the barrel tip
    this.muzzle = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.muzzle.position.set(0.42, -0.34, -1.5); this.hand.add(this.muzzle); this.muzzleT = 0;
    this._tracers = [];
    this.hand.visible = false;
  }
  makeDropMesh(item) {
    if (item < 256) {
      const g = new THREE.BoxGeometry(0.28, 0.28, 0.28); this._heldBlockUV(g, item);
      return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: this.tex, alphaTest: 0.5 }));
    }
    if (!this._dropTex) this._dropTex = new Map();
    let tex = this._dropTex.get(item);
    if (!tex) { tex = new THREE.CanvasTexture(this.ui.iconCanvas(item)); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; this._dropTex.set(item, tex); }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.25, side: THREE.DoubleSide }));
    return m;
  }
  _tracer(a, b, color) {
    const g = new THREE.BufferGeometry().setFromPoints([a, b]);
    const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }));
    this.scene.add(line); this._tracers.push({ line, life: 0.05 });
  }
  rayBlockDist(o, dir, maxD) {
    let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
    const sx = Math.sign(dir.x), sy = Math.sign(dir.y), sz = Math.sign(dir.z);
    const dx = sx !== 0 ? Math.abs(1 / dir.x) : 1e9, dy = sy !== 0 ? Math.abs(1 / dir.y) : 1e9, dz = sz !== 0 ? Math.abs(1 / dir.z) : 1e9;
    let tx = sx > 0 ? (x + 1 - o.x) / dir.x : sx < 0 ? (x - o.x) / dir.x : 1e9;
    let ty = sy > 0 ? (y + 1 - o.y) / dir.y : sy < 0 ? (y - o.y) / dir.y : 1e9;
    let tz = sz > 0 ? (z + 1 - o.z) / dir.z : sz < 0 ? (z - o.z) / dir.z : 1e9;
    let t = 0;
    while (t <= maxD) {
      const id = this.world.getBlock(x, y, z);
      if (id !== B.AIR && id !== B.WATER && blockDef(id).solid) return t;
      if (tx < ty && tx < tz) { x += sx; t = tx; tx += dx; }
      else if (ty < tz) { y += sy; t = ty; ty += dy; }
      else { z += sz; t = tz; tz += dz; }
    }
    return maxD;
  }
  fireGun(player, d) {
    const o = player.eye(); const base = new THREE.Vector3(); this.camera.getWorldDirection(base);
    for (let i = 0; i < (d.pellets || 1); i++) {
      const dir = base.clone();
      if (d.spread) { dir.x += (Math.random() - 0.5) * d.spread; dir.y += (Math.random() - 0.5) * d.spread; dir.z += (Math.random() - 0.5) * d.spread; dir.normalize(); }
      const blockT = this.rayBlockDist(o, dir, d.range);
      let endT = Math.min(blockT, d.range);
      const mob = this.mobs.rayHit(o, dir, Math.min(blockT, d.range));
      if (mob) { const mt = rayAABB(o, dir, mob.aabb()); if (mt != null) { endT = mt; mob.damage(d.dmg, dir.x, dir.z, this.mobs); this.mobs.hitFx(mob.pos.x, mob.pos.y + mob.h * 0.6, mob.pos.z, mob.npc ? 0xb01010 : 0x884422, 8); if (mob.npc) { this.addWanted(mob.def.cop ? 1 : 2); this.mobs.alarm(mob.pos.x, mob.pos.z, 22); } } }
      const start = o.clone().addScaledVector(dir, 0.4).addScaledVector(base, 0); // muzzle-ish origin
      this._tracer(start, o.clone().addScaledVector(dir, endT), d.tracer || 0xfff0a0);
    }
    // firing in town draws police attention
    if (this.gen && this.gen.cityAt(Math.floor(player.pos.x), Math.floor(player.pos.z)) && player.wanted < 1) this.addWanted(1);
    player.recoil = Math.min(1.4, (player.recoil || 0) + (d.pellets > 1 ? 1.0 : 0.6));
    this.muzzle.material.color.set(d.tracer || 0xfff0a0); this.muzzleT = 0.05; this.muzzle.material.opacity = 1;
    this.muzzle.scale.setScalar(0.7 + Math.random() * 0.6); this.muzzle.rotation.z = Math.random() * 6.28;
  }
  _heldBlockUV(g, blockId) {
    const d = blockDef(blockId), u = g.attributes.uv;
    for (let f = 0; f < 6; f++) { const uv = this.uv.get(texOf(d, f)) || [0, 0, 1, 1]; const i = f * 4; u.setXY(i, uv[0], uv[1]); u.setXY(i + 1, uv[2], uv[1]); u.setXY(i + 2, uv[0], uv[3]); u.setXY(i + 3, uv[2], uv[3]); }
    u.needsUpdate = true;
  }
  makeHeldModel(id) {
    const grp = new THREE.Group();
    if (id == null) return grp;
    if (id < 256) {
      const g = new THREE.BoxGeometry(0.34, 0.34, 0.34); this._heldBlockUV(g, id);
      const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: this.tex, alphaTest: 0.5 })); m.rotation.set(0.2, -0.5, 0); grp.add(m);
    } else {
      const d = itemDef(id); const tier = d.tier || 1;
      const wood = 0x8a5a2e, metal = { 1: 0x9a6a3a, 2: 0x9a9a9a, 3: 0xdcdcdc, 4: 0x5ad7d2 }[tier] || 0x9a9a9a;
      const bar = (w, h, dp, col, x, y, z) => { const mm = new THREE.Mesh(new THREE.BoxGeometry(w, h, dp), new THREE.MeshLambertMaterial({ color: col })); mm.position.set(x, y, z); grp.add(mm); return mm; };
      if (d.gun) { return this.makeGunModel(d.id, bar, grp); }
      if (d.armor) { bar(0.34, 0.3, 0.12, d.acol || 0x999999, 0, 0.1, 0); bar(0.34, 0.06, 0.13, 0x111111, 0, -0.06, 0); grp.rotation.set(0, 0, 0.2); return grp; }
      if (d.melee) {
        if (d.id === ITEM.KNIFE) { bar(0.06, 0.18, 0.06, 0x2a2a2e, 0, 0, 0); bar(0.04, 0.34, 0.1, 0xd8dce2, 0, 0.26, 0); bar(0.12, 0.04, 0.08, 0x55585e, 0, 0.1, 0); }
        else { bar(0.07, 0.6, 0.07, 0x8a5a2e, 0, 0.05, 0); bar(0.1, 0.34, 0.1, 0xb07a3a, 0, 0.4, 0); }
        grp.rotation.set(0.3, 0, 0.35); return grp;
      }
      if (d.tool) {
        bar(0.05, 0.5, 0.05, wood, 0, 0, 0); // handle
        if (d.tool === 'pickaxe') bar(0.36, 0.07, 0.06, metal, 0, 0.22, 0);
        else if (d.tool === 'axe') { bar(0.12, 0.16, 0.06, metal, 0.1, 0.2, 0); }
        else if (d.tool === 'shovel') bar(0.1, 0.12, 0.06, metal, 0, 0.27, 0);
        else if (d.tool === 'sword') { bar(0.06, 0.42, 0.04, metal, 0, 0.28, 0); bar(0.18, 0.05, 0.05, wood, 0, 0.06, 0); }
        else bar(0.1, 0.1, 0.06, metal, 0, 0.22, 0);
        grp.rotation.set(0, 0, 0.4);
      } else {
        // generic items (ingots, food, dust, gems...) render as a flat sprite of
        // their icon, extruded slightly — exactly how Minecraft shows held items.
        if (!this._dropTex) this._dropTex = new Map();
        let tex = this._dropTex.get(id);
        if (!tex) { tex = new THREE.CanvasTexture(this.ui.iconCanvas(id)); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; this._dropTex.set(id, tex); }
        const spr = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.45), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.25, side: THREE.DoubleSide }));
        const back = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.45), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.25, side: THREE.DoubleSide })); back.position.z = -0.03;
        grp.add(spr); grp.add(back); grp.rotation.set(0, -0.35, 0);
      }
    }
    return grp;
  }
  makeGunModel(id, bar, grp) {
    // boxes oriented with barrel pointing -Z (forward). Dark gunmetal with accents.
    const M = 0x23262c, D = 0x141519, A = 0x3a3f47, W = 0x6b4a2a, BL = 0x0c0d10;
    if (id === ITEM.PISTOL) {
      bar(0.13, 0.18, 0.5, M, 0, 0, -0.05);      // slide/body
      bar(0.09, 0.09, 0.34, BL, 0, 0.01, -0.36); // barrel
      bar(0.12, 0.26, 0.14, A, 0, -0.2, 0.08);   // grip
      bar(0.04, 0.08, 0.06, D, 0, -0.06, 0.06);  // trigger guard
    } else if (id === ITEM.SMG) {
      bar(0.14, 0.18, 0.62, M, 0, 0, -0.1);
      bar(0.08, 0.08, 0.42, BL, 0, 0.02, -0.5);
      bar(0.12, 0.3, 0.13, A, 0, -0.22, 0.12);   // grip
      bar(0.1, 0.34, 0.12, D, 0, -0.26, -0.12);  // magazine
      bar(0.05, 0.06, 0.2, D, 0, 0.13, 0.05);    // top rail
    } else if (id === ITEM.RIFLE) {
      bar(0.14, 0.2, 0.95, M, 0, 0, -0.1);
      bar(0.08, 0.08, 0.6, BL, 0, 0.02, -0.66);
      bar(0.12, 0.3, 0.14, A, 0, -0.22, 0.16);   // grip
      bar(0.11, 0.36, 0.14, D, 0, -0.28, -0.06); // magazine (curved-ish)
      bar(0.12, 0.16, 0.26, W, 0, -0.02, 0.42);  // stock
      bar(0.05, 0.07, 0.34, D, 0, 0.15, -0.1);   // rail + sight
    } else if (id === ITEM.SHOTGUN) {
      bar(0.18, 0.2, 0.9, M, 0, 0, -0.05);
      bar(0.1, 0.12, 0.62, BL, 0, 0.03, -0.6);   // double barrel block
      bar(0.13, 0.28, 0.16, W, 0, -0.2, 0.16);   // grip/wrist
      bar(0.14, 0.16, 0.3, W, 0, -0.04, 0.46);   // wooden stock
      bar(0.12, 0.1, 0.2, A, 0, -0.12, -0.18);   // pump
    } else if (id === ITEM.SNIPER) {
      bar(0.14, 0.18, 1.2, M, 0, 0, -0.1);
      bar(0.07, 0.07, 0.8, BL, 0, 0.0, -0.85);   // long barrel
      bar(0.12, 0.28, 0.14, A, 0, -0.2, 0.18);   // grip
      bar(0.14, 0.14, 0.34, W, 0, -0.02, 0.5);   // stock
      bar(0.1, 0.1, 0.34, D, 0, 0.2, -0.05);     // scope body
      bar(0.13, 0.13, 0.06, 0x224466, 0, 0.2, -0.23); // scope lens
    } else { bar(0.14, 0.18, 0.6, M, 0, 0, 0); }
    grp.scale.setScalar(0.95);
    return grp;
  }
  updateHeld() {
    const held = this.inventory.held(); const id = held ? held.id : null;
    if (id === this.heldId) return; this.heldId = id;
    this.heldGroup.clear();
    const m = this.makeHeldModel(id); const d = id != null ? itemDef(id) : null;
    if (d && d.gun) m.position.set(0.36, -0.4, -0.6);
    else m.position.set(0.34, -0.3, -0.74);
    this.heldGroup.add(m);
  }
  start(mode) {
    this.mode = mode;
    this.gen = new WorldGen((Math.random() * 1e9) | 0);
    this.world = new World(this.scene, this.gen, this.materials, this.uv);
    this.mobs = new MobManager(this.scene, this.world, this);
    this.player = new Player(this);
    this.inventory.slots.fill(null); this.inventory.craft.fill(null); this.inventory.armor.fill(null); this.inventory.cursor = null; this.inventory.sel = 0;
    if (mode === 'creative') { [B.GRASS, B.DIRT, B.STONE, B.COBBLE, B.PLANKS, B.LOG, B.LEAVES, B.GLASS, B.SAND].forEach((id, i) => this.inventory.slots[i] = { id, count: 64 }); }
    // spawn (prefer a road in the city near origin)
    const sp = this.gen.spawnPoint(); this.spawnPt = sp;
    for (let i = 0; i < 14; i++) this.world.update(sp.x, sp.z);
    this.player._applyStage(STAGES.length - 1); this.player.ageT = 1e9; // start as a grown adult
    this.buildHome(sp);
    const sy = this.world.highestY(sp.x, sp.z); this.player.pos.set(sp.x + 0.5, Math.max(sy + 2, sp.y + 2), sp.z + 0.5);
    if (mode === 'survival') this.mobs.seedAround(this.player);
    this.mobs.populateCity(this.player);
    this.playing = true; this.paused = false; this.hand.visible = true;
    this.ui.showMenu(null); this.input.lock();
    this.startStory(sp);
  }
  buildHome(sp) {
    const W = this.world; const Q = (x, y, z, id) => W.setBlockQuiet(x, y, z, id);
    const room = (cx, gy, cz, hw, hd, hgt, wall, floor, ceil, glass) => {
      for (let x = -hw; x <= hw; x++) for (let z = -hd; z <= hd; z++) {
        Q(cx + x, gy, cz + z, floor);
        for (let y = 1; y <= hgt; y++) { const edge = (x === -hw || x === hw || z === -hd || z === hd); let id = B.AIR; if (y === hgt) id = ceil; else if (edge) id = ((y === 2 || y === 3) && glass && Math.abs(x) !== hw && Math.abs(z) !== hd && ((x + z) & 1) === 0) ? glass : wall; Q(cx + x, gy + y, cz + z, id); }
      }
    };
    const hx = sp.x, hz = sp.z + 22, gy = W.highestY(hx, hz);
    room(hx, gy, hz, 4, 3, 4, B.STUCCO_TEAL, B.PLANKS, B.STUCCO_CREAM, B.WINDOW);
    Q(hx, gy + 1, hz - 3, B.AIR); Q(hx, gy + 2, hz - 3, B.AIR);
    Q(hx - 3, gy + 1, hz + 2, B.WOOL); Q(hx - 2, gy + 1, hz + 2, B.WOOL);
    Q(hx + 3, gy + 1, hz - 2, B.CRAFTING_TABLE); Q(hx + 2, gy + 1, hz - 2, B.FURNACE);
    Q(hx, gy + 3, hz, B.GLOWSTONE); Q(hx, gy + 5, hz, B.NEON);
    this.home = { x: hx + 0.5, y: gy + 1, z: hz + 0.5 };
    W.flushEdits();
  }
  // ---- story campaign ----
  startStory(sp) {
    this.missions = MISSIONS; this.mIdx = -1; this.missionState = 'between'; this.betweenT = 2.5;
    if (!this.marker) { this.marker = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 60, 10), new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.22, depthWrite: false })); this.marker.frustumCulled = false; this.scene.add(this.marker); }
    this.marker.visible = false; this.card = null; this.cardT = 0;
  }
  missionWorldPos(off) { const sp = this.spawnPt; const x = sp.x + off.dx, z = sp.z + off.dz; return { x: x + 0.5, y: this.world.highestY(x, z) + 1, z: z + 0.5 }; }
  showCard(title, sub, pass) { this.card = { title, sub, pass }; this.cardT = pass ? 4.5 : 6; }
  startMission(i) { this.mIdx = i; this.stepIdx = 0; const m = this.missions[i]; this.showCard('CHAPTER ' + (i + 1) + ': ' + m.title, m.intro, false); this.setupStep(); }
  setupStep() {
    const s = this.missions[this.mIdx].steps[this.stepIdx]; this.giver = null; this._killTargets = null;
    if (s.at) { this.stepPos = this.missionWorldPos(s.at); this.marker.position.set(this.stepPos.x, this.stepPos.y + 30, this.stepPos.z); this.marker.visible = true; this.marker.material.color.set(s.type === 'kill' ? 0xff5a5a : 0xffd23a); }
    else { this.stepPos = null; this.marker.visible = false; }
    if (s.type === 'talk' && this.stepPos) { this.giver = this.mobs.spawn('npc', this.stepPos.x, this.stepPos.y, this.stepPos.z, namedPersona(s.who)); }
    if (s.type === 'kill' && this.stepPos) { this._killTargets = []; for (let k = 0; k < (s.count || 1); k++) { const t = this.mobs.spawn('npc', this.stepPos.x + (Math.random() * 4 - 2), this.stepPos.y, this.stepPos.z + (Math.random() * 4 - 2), namedPersona('Salcido Thug')); t.missionTarget = true; this._killTargets.push(t); } }
    if (s.type === 'evade') this.addWanted(s.wanted || 2);
  }
  advanceStep() {
    const m = this.missions[this.mIdx]; this.stepIdx++;
    if (this.stepIdx < m.steps.length) { this.setupStep(); return; }
    this.player.money += m.reward || 0;
    this.showCard('MISSION PASSED', (m.reward ? '+$' + m.reward : '') + (m.final ? '   THE END — King of Neon Bay' : ''), true);
    this.marker.visible = false;
    if (m.final) { this.mIdx = null; this.ui.el.objective.textContent = ''; this.missionState = 'done'; return; }
    this.missionState = 'between'; this.betweenT = 5;
  }
  updateMissions(dt) {
    if (!this.missions) return;
    if (this.cardT > 0) this.cardT -= dt; this._renderCard();
    if (this.missionState === 'between') { this.betweenT -= dt; if (this.betweenT <= 0) { this.missionState = 'active'; this.startMission(this.mIdx + 1); } return; }
    if (this.missionState !== 'active' || this.mIdx == null) return;
    const m = this.missions[this.mIdx], s = m.steps[this.stepIdx], p = this.player; let done = false;
    if (s.type === 'talk') done = this.giver && !this.giver.dead && Math.hypot(this.giver.pos.x - p.pos.x, this.giver.pos.z - p.pos.z) < 3.2;
    else if (s.type === 'goto') done = this.stepPos && Math.hypot(this.stepPos.x - p.pos.x, this.stepPos.z - p.pos.z) < 4;
    else if (s.type === 'getcar') done = !!(p.vehicle && p.vehicle.kind === 'car');
    else if (s.type === 'drive') done = this.stepPos && p.vehicle && p.vehicle.kind === 'car' && Math.hypot(this.stepPos.x - p.pos.x, this.stepPos.z - p.pos.z) < 7;
    else if (s.type === 'evade') done = p.wanted <= 0;
    else if (s.type === 'kill') { const alive = this._killTargets ? this._killTargets.filter(t => !t.dead).length : 0; done = alive === 0; }
    let txt = s.text;
    if (s.type === 'kill' && this._killTargets) txt += '  (' + (this._killTargets.length - this._killTargets.filter(t => !t.dead).length) + '/' + this._killTargets.length + ')';
    if (this.stepPos && (s.type === 'goto' || s.type === 'drive' || s.type === 'talk')) txt += '   ' + Math.round(Math.hypot(this.stepPos.x - p.pos.x, this.stepPos.z - p.pos.z)) + 'm →';
    this.ui.el.objective.textContent = txt;
    if (done) this.advanceStep();
  }
  _renderCard() {
    const el = this.ui.el.missiontitle; if (!el) return;
    if (this.card && this.cardT > 0) { el.classList.toggle('pass', !!this.card.pass); el.innerHTML = '<div class="mt">' + this.card.title + '</div><div class="ms">' + (this.card.sub || '') + '</div>'; el.style.opacity = Math.min(1, this.cardT); }
    else el.style.opacity = '0';
  }
  onHurt() { document.body.classList.add('hurt'); clearTimeout(this._ht); this._ht = setTimeout(() => document.body.classList.remove('hurt'), 180); }
  damagePlayer(n) { this.player.takeDamage(n); }
  addWanted(n) { const p = this.player; if (!p) return; p.wanted = Math.min(5, p.wanted + n); p.heat = Math.max(p.heat, 12 + p.wanted * 6); }
  updateStory(dt) {
    if (this.story == null) return; this.storyT += dt; const p = this.player; let txt = '';
    if (this.homeMarker) this.homeMarker.visible = this.story === 1;
    if (this.story === 0) {
      txt = "You were born at Neon Bay General — say hi to your parents!";
      const fam = this.mobs.family || []; const near = fam.length && fam.every(m => !m.dead && Math.hypot(m.pos.x - p.pos.x, m.pos.z - p.pos.z) < 6);
      if ((near && this.storyT > 4) || this.storyT > 16) { this.story = 1; this.storyT = 0; for (const m of (this.mobs.family || [])) if (!m.dead) m.goto = { x: this.home.x, z: this.home.z }; }
    } else if (this.story === 1) {
      const d = Math.hypot(this.home.x - p.pos.x, this.home.z - p.pos.z);
      txt = 'Follow your parents home  (' + Math.round(d) + 'm) →';
      for (const m of (this.mobs.family || [])) if (!m.dead && !m.goto && Math.hypot(m.pos.x - this.home.x, m.pos.z - this.home.z) > 2.5) m.goto = { x: this.home.x, z: this.home.z };
      if (d < 5) { this.story = 2; this.storyT = 0; }
    } else if (this.story === 2) {
      txt = "Welcome home! Eat, grow up, and live your life in Neon Bay.";
      if (this.storyT > 9) { this.story = null; }
    }
    this.ui.el.objective.textContent = txt;
  }
  onDeath() { if (this.player.vehicle) this.player.exitVehicle(); this.player.wanted = 0; this.player.heat = 0; this.input.unlock(); this.ui.showMenu('death'); }
  respawn() { const sp = this.spawnPt || { x: 8, z: 8 }; const sy = this.world.highestY(sp.x, sp.z); const p = this.player; p.pos.set(sp.x + 0.5, sy + 2, sp.z + 0.5); p.vel.set(0, 0, 0); p.health = 20; p.hunger = 20; p.sat = 5; p.dead = false; p.fallStart = null; p.wanted = 0; p.heat = 0; this.ui.showMenu(null); this.input.lock(); }
  pause() { if (!this.playing || this.paused) return; this.paused = true; this.input.unlock(); this.ui.showMenu('pause'); }
  resume() { this.paused = false; this.ui.showMenu(null); this.input.lock(); }
  loop() {
    requestAnimationFrame(() => this.loop());
    const dt = Math.min(this.clock.getDelta(), 0.1); this.time += dt;

    if (this.playing) {
      // global keys
      const sc = this.ui.open === 'inv' || this.ui.open === 'craft' || this.ui.open === 'palette' || this.ui.open === 'chat';
      if (this.input.p('KeyE')) { if (sc) this.ui.close(); else if (!this.paused && !this.ui.open) this.ui.openInventory(); }
      if (this.input.p('Escape')) { if (sc) this.ui.close(); else if (this.paused) this.resume(); else if (!this.ui.open) this.pause(); }
      if (!sc && !this.paused) {
        // F: enter/exit nearest vehicle.  P: call in a plane.  G: mug a nearby person.
        if (this.input.p('KeyF')) { if (this.player.vehicle) this.player.exitVehicle(); else { const car = this.mobs.nearestCar(this.player.pos, 4); if (car) this.player.enterVehicle(car); } }
        if (this.input.p('KeyP') && !this.player.vehicle) { const pl2 = this.mobs.spawnPlane(this.player); this.player.enterVehicle(pl2); }
        if (this.input.p('KeyG') && !this.player.vehicle) { const v = new THREE.Vector3(); this.camera.getWorldDirection(v); const t = this.mobs.muggable(this.player.pos, v); if (t) { const loot = Math.min(t.npc.money | 0, 15 + (Math.random() * 60 | 0)); t.npc.money -= loot; this.player.money += loot; t.flee = 7; this.mobs.alarm(t.pos.x, t.pos.z, 16); this.mobs.hitFx(t.pos.x, t.pos.y + 1.2, t.pos.z, 0x6be06b, 8); this.addWanted(1); } }
      }
      // wanted decays when you lie low
      if (this.player.heat > 0) { this.player.heat -= dt; if (this.player.heat <= 0) { this.player.wanted = Math.max(0, this.player.wanted - 1); this.player.heat = this.player.wanted > 0 ? 14 : 0; } }
      const frozen = this.paused || this.ui.open;
      if (!frozen && !this.player.dead) this.player.update(dt, this.input);
      if (this.world) this.world.update(this.player.pos.x, this.player.pos.z);
      if (this.mobs && !frozen) this.mobs.update(dt, this.player, this.dayLight != null ? this.dayLight : 1);
      if (!frozen) this.updateMissions(dt);
      this.gameTime += dt;
      const pl = this.player;
      // when driving/flying, use a third-person chase camera and hide the held viewmodel
      if (pl.vehicle) {
        const v = pl.vehicle; let fx, fy, fz;
        if (v.kind === 'plane') { const cp = Math.cos(pl.pitch); fx = Math.sin(pl.yaw) * cp; fy = Math.sin(pl.pitch); fz = Math.cos(pl.yaw) * cp; }
        else { fx = Math.sin(v.yaw); fy = 0; fz = Math.cos(v.yaw); }
        const back = v.kind === 'plane' ? 11 : 8, up = v.kind === 'plane' ? 3.5 : 4;
        this.camera.position.set(v.pos.x - fx * back, v.pos.y + up - fy * back, v.pos.z - fz * back);
        this.camera.lookAt(v.pos.x + fx * 2, v.pos.y + 1.2 + fy * 2, v.pos.z + fz * 2);
        this.hand.visible = false; this.sel.visible = false; this.crack.visible = false;
        this._sky(dt); if (this.playing) this.ui.update(); this.input.end(); this.renderer.render(this.scene, this.camera); return;
      }
      // view model: held item + animations (mining swing, walk bob, gun recoil)
      this.updateHeld();
      const hi = this.inventory.held(); const hd = hi ? itemDef(hi.id) : null;
      const speed = Math.hypot(pl.vel.x, pl.vel.z); const walkBob = pl.onGround ? Math.min(1, speed / 4.4) : 0;
      this._bobT = (this._bobT || 0) + dt * (3 + speed * 1.7);
      const mining = (pl.breakTarget && pl.breakProgress > 0 && this.mode !== 'creative') || (this.mode === 'creative' && this.input.mL && pl.target && !(hd && hd.gun));
      let sw;
      if (mining) { this._mineT = (this._mineT || 0) + dt; sw = Math.abs(Math.sin(this._mineT * 11)); }
      else { this._mineT = 0; sw = Math.sin((pl.swing || 0) * Math.PI); }
      let rx = -sw * 1.2, ry = sw * 0.3, rz = sw * 0.12;
      // idle breathing sway + pronounced walk bob
      const idle = this.time;
      let px = Math.cos(this._bobT) * 0.03 * walkBob + Math.sin(idle * 0.7) * 0.01;
      let py = -sw * 0.18 + Math.abs(Math.sin(this._bobT)) * 0.05 * walkBob + Math.sin(idle * 1.3) * 0.012;
      let pz = sw * 0.08;
      if (hd && hd.gun) { pl.recoil = Math.max(0, pl.recoil - dt * 7); rx += pl.recoil * 0.55; pz += pl.recoil * 0.18; py += pl.recoil * 0.03; if (pl.reloadT > 0) { rx += 1.0; py -= 0.2; ry += 0.3; } }
      this.hand.rotation.set(rx, ry, rz); this.hand.position.set(px, py, pz);
      // muzzle flash + tracer decay
      if (this.muzzleT > 0) this.muzzleT -= dt;
      this.muzzle.material.opacity = this.muzzleT > 0 ? Math.max(0, this.muzzleT / 0.05) : 0;
      this.muzzle.visible = !!(hd && hd.gun) && this.muzzle.material.opacity > 0;
      if (this._tracers && this._tracers.length) {
        for (const tr of this._tracers) { tr.life -= dt; tr.line.material.opacity = Math.max(0, tr.life / 0.05); }
        this._tracers = this._tracers.filter(tr => { if (tr.life <= 0) { this.scene.remove(tr.line); tr.line.geometry.dispose(); tr.line.material.dispose(); return false; } return true; });
      }
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
    const dayLight = smooth(-0.08, 0.22, elev); this.dayLight = dayLight;
    this.uniforms.uDay.value = 0.1 + 0.9 * dayLight;
    this.uniforms.uTime.value = this.time;
    this.uniforms.uAmbient.value = 0.16 + 0.16 * dayLight;
    // drive entity lighting from the day/night cycle so people & cars match the world
    if (this.sun) { this.sun.position.copy(this.camera.position).addScaledVector(sunDir, 60); this.sun.target.position.copy(this.camera.position); this.sun.target.updateMatrixWorld(); this.sun.intensity = 0.35 + 1.05 * dayLight; this.sun.color.setRGB(1, 0.92 - 0.1 * (1 - dayLight), 0.82 - 0.2 * (1 - dayLight)); }
    if (this.hemi) { this.hemi.intensity = 0.45 + 0.55 * dayLight; }
    // tropical "Neon Bay" palette — warm teal day sky, hot pink/orange sunsets
    const dayTop = new THREE.Color(0x49b7d6), dayBot = new THREE.Color(0xfbe3c8);
    const nightTop = new THREE.Color(0x0a0c22), nightBot = new THREE.Color(0x2a1740);
    const top = nightTop.clone().lerp(dayTop, dayLight), bot = nightBot.clone().lerp(dayBot, dayLight);
    const horizon = clamp(1 - Math.abs(elev) / 0.4, 0, 1);
    const sunset = new THREE.Color(0xff7eb0).lerp(new THREE.Color(0xffb347), 0.5);
    bot.lerp(sunset, horizon * 0.7); top.lerp(new THREE.Color(0xff8fb0), horizon * 0.3);
    // rain: desaturate sky toward soft grey
    if (this.weather && this.weather.raining()) { const grey = new THREE.Color(0x9aa6b0).multiplyScalar(0.3 + 0.6 * dayLight); top.lerp(grey, 0.6); bot.lerp(grey, 0.6); }
    this.sky.skyU.uTop.value.copy(top); this.sky.skyU.uBottom.value.copy(bot);
    this.uniforms.uFog.value.copy(bot);
    this.sky.update(this.camera, sunDir, this.time, dayLight);
    if (this.weather && this.playing && this.gen) { let snowy = false; try { snowy = this.gen.column(Math.floor(this.player.pos.x), Math.floor(this.player.pos.z)).biome === 'snow'; } catch (e) {} this.weather.update(dt, this.camera, snowy); }
    this.arm.material.color.setRGB(0.88 * (0.3 + 0.7 * dayLight) + 0.1, 0.62 * (0.3 + 0.7 * dayLight) + 0.08, 0.45 * (0.3 + 0.7 * dayLight) + 0.06);
  }
}
function smooth(e0, e1, x) { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }

function boot() { try { new Game(); const b = document.getElementById('boot'); if (b) b.style.display = 'none'; } catch (e) { const b = document.getElementById('boot'); if (b) { b.style.display = 'block'; b.style.color = '#f88'; b.textContent = 'Error: ' + e.message; } console.error(e); } }
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot); else boot();

