// ============================================================================
//  World generation: biomes, terrain, caves, ores, decorations, dimensions
// ============================================================================
import { WORLD_HEIGHT, SEA_LEVEL, CHUNK_SX, CHUNK_SZ, DIM, clamp, smoothstep, lerp } from './constants.js';
import { BLOCK } from './ids.js';
import { Noise, hashSeed } from './noise.js';

// fast deterministic hash -> [0,1)
function hash3(x, y, z, s) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647 + s * 1274126177) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}
function hash2(x, z, s) { return hash3(x, z, 9871, s); }

// ---- biome definitions ------------------------------------------------------
const TINT = {
  plains_g: [0.49, 0.74, 0.36], plains_f: [0.43, 0.66, 0.30],
  forest_g: [0.41, 0.69, 0.31], forest_f: [0.36, 0.60, 0.26],
  jungle_g: [0.34, 0.78, 0.22], jungle_f: [0.30, 0.70, 0.20],
  savanna_g: [0.74, 0.72, 0.34], savanna_f: [0.66, 0.66, 0.30],
  swamp_g: [0.42, 0.52, 0.30], swamp_f: [0.40, 0.50, 0.28],
  snowy_g: [0.50, 0.62, 0.46], snowy_f: [0.46, 0.58, 0.46],
  desert_g: [0.62, 0.66, 0.34], desert_f: [0.56, 0.60, 0.30],
  badlands_g: [0.62, 0.56, 0.30], badlands_f: [0.62, 0.56, 0.30],
  mountain_g: [0.48, 0.64, 0.40], mountain_f: [0.44, 0.58, 0.38],
};
const WATER_T = { normal: [0.24, 0.46, 0.92], swamp: [0.36, 0.46, 0.30], cold: [0.22, 0.40, 0.80] };

function biomeDef(id) { return BIOMES[id]; }
const BIOMES = {
  ocean:    { name: 'Ocean', top: BLOCK.GRAVEL, sub: BLOCK.SAND, tree: 'none', grassTint: TINT.plains_g, foliageTint: TINT.plains_f, waterTint: WATER_T.normal },
  beach:    { name: 'Beach', top: BLOCK.SAND, sub: BLOCK.SAND, tree: 'none', grassChance: 0, grassTint: TINT.plains_g, foliageTint: TINT.plains_f, waterTint: WATER_T.normal },
  plains:   { name: 'Plains', top: BLOCK.GRASS, sub: BLOCK.DIRT, tree: 'oak', treeChance: 0.006, grassChance: 0.20, flowerChance: 0.02, grassTint: TINT.plains_g, foliageTint: TINT.plains_f, waterTint: WATER_T.normal },
  forest:   { name: 'Forest', top: BLOCK.GRASS, sub: BLOCK.DIRT, tree: 'oakbirch', treeChance: 0.06, grassChance: 0.18, flowerChance: 0.02, grassTint: TINT.forest_g, foliageTint: TINT.forest_f, waterTint: WATER_T.normal },
  jungle:   { name: 'Jungle', top: BLOCK.GRASS, sub: BLOCK.DIRT, tree: 'jungle', treeChance: 0.10, grassChance: 0.30, flowerChance: 0.01, grassTint: TINT.jungle_g, foliageTint: TINT.jungle_f, waterTint: WATER_T.normal },
  savanna:  { name: 'Savanna', top: BLOCK.GRASS, sub: BLOCK.DIRT, tree: 'oak', treeChance: 0.008, grassChance: 0.25, grassTint: TINT.savanna_g, foliageTint: TINT.savanna_f, waterTint: WATER_T.normal },
  swamp:    { name: 'Swamp', top: BLOCK.GRASS, sub: BLOCK.DIRT, tree: 'oak', treeChance: 0.02, grassChance: 0.25, mushroom: true, grassTint: TINT.swamp_g, foliageTint: TINT.swamp_f, waterTint: WATER_T.swamp },
  desert:   { name: 'Desert', top: BLOCK.SAND, sub: BLOCK.SANDSTONE, tree: 'none', cactus: true, deadbush: true, grassTint: TINT.desert_g, foliageTint: TINT.desert_f, waterTint: WATER_T.normal },
  badlands: { name: 'Badlands', top: BLOCK.RED_SAND, sub: BLOCK.TERRACOTTA, tree: 'none', deadbush: true, grassTint: TINT.badlands_g, foliageTint: TINT.badlands_f, waterTint: WATER_T.normal },
  snowy:    { name: 'Snowy Plains', top: BLOCK.GRASS_BLOCK_SNOW, sub: BLOCK.DIRT, tree: 'spruce', treeChance: 0.02, snow: true, grassTint: TINT.snowy_g, foliageTint: TINT.snowy_f, waterTint: WATER_T.cold },
  taiga:    { name: 'Taiga', top: BLOCK.GRASS, sub: BLOCK.DIRT, tree: 'spruce', treeChance: 0.05, grassChance: 0.10, grassTint: TINT.snowy_g, foliageTint: TINT.snowy_f, waterTint: WATER_T.cold },
  mountains:{ name: 'Mountains', top: BLOCK.GRASS, sub: BLOCK.DIRT, tree: 'spruce', treeChance: 0.01, mountainous: true, grassTint: TINT.mountain_g, foliageTint: TINT.mountain_f, waterTint: WATER_T.cold },
};

export class WorldGen {
  constructor(seed) {
    this.seedStr = seed;
    this.seed = (typeof seed === 'number') ? seed : hashSeed(String(seed));
    this.nElev = new Noise(this.seed + 1);
    this.nCont = new Noise(this.seed + 2);
    this.nMount = new Noise(this.seed + 3);
    this.nTemp = new Noise(this.seed + 4);
    this.nHumid = new Noise(this.seed + 5);
    this.nDetail = new Noise(this.seed + 6);
    this.nCave = new Noise(this.seed + 7);
    this.nCave2 = new Noise(this.seed + 8);
    this.nNether = new Noise(this.seed + 9);
    this.nEnd = new Noise(this.seed + 10);
    this._colCache = new Map();
  }

  // ---- per-column terrain (overworld) ----
  column(wx, wz) {
    const key = wx + ',' + wz;
    const cached = this._colCache.get(key);
    if (cached) return cached;
    const cont = this.nCont.fbm2(wx * 0.0016, wz * 0.0016, 4);
    const ero = this.nElev.fbm2(wx * 0.004 + 100, wz * 0.004, 3);
    const temp = this.nTemp.fbm2(wx * 0.0011 + 50, wz * 0.0011, 3);
    const humid = this.nHumid.fbm2(wx * 0.0012, wz * 0.0012 + 80, 3);

    let base = SEA_LEVEL + cont * 20 + ero * 7;
    const mfac = smoothstep(0.15, 0.6, cont);
    const mountain = this.nMount.ridge2(wx * 0.0055, wz * 0.0055, 4);
    base += mountain * 46 * mfac;
    const detail = this.nDetail.fbm2(wx * 0.03, wz * 0.03, 3) * 3;
    let height = Math.floor(base + detail);
    height = clamp(height, 3, WORLD_HEIGHT - 14);

    // choose biome
    let biomeId;
    if (height <= SEA_LEVEL - 2) biomeId = 'ocean';
    else if (height <= SEA_LEVEL + 1) biomeId = (temp < -0.35) ? 'snowy' : 'beach';
    else {
      const high = height > SEA_LEVEL + 38;
      if (high) biomeId = (temp < -0.1) ? 'mountains' : 'mountains';
      else if (temp < -0.35) biomeId = (humid > 0.0) ? 'taiga' : 'snowy';
      else if (temp > 0.4) {
        if (humid < -0.25) biomeId = (cont > 0.45) ? 'badlands' : 'desert';
        else if (humid < 0.25) biomeId = 'savanna';
        else biomeId = 'jungle';
      } else {
        if (humid > 0.45 && base < SEA_LEVEL + 4) biomeId = 'swamp';
        else if (humid > 0.12) biomeId = 'forest';
        else biomeId = 'plains';
      }
    }
    const biome = BIOMES[biomeId];
    const res = { height, surfaceY: height, biomeId, biome, temp, humid, cont, mountain };
    if (this._colCache.size > 8000) this._colCache.clear();
    this._colCache.set(key, res);
    return res;
  }

  biomeAt(wx, wz) { return this.column(wx, wz).biome; }

  tintAt(wx, wz, type, dim) {
    if (dim === DIM.NETHER) return type === 'water' ? [0.4, 0.1, 0.1] : [0.55, 0.32, 0.28];
    if (dim === DIM.END) return type === 'water' ? [0.2, 0.2, 0.4] : [0.62, 0.58, 0.45];
    const b = this.biomeAt(wx, wz);
    if (type === 'grass') return b.grassTint;
    if (type === 'foliage') return b.foliageTint;
    if (type === 'water') return b.waterTint || WATER_T.normal;
    return [1, 1, 1];
  }

  // ---- chunk generation dispatch ----
  generateChunk(chunk, dim) {
    if (dim === DIM.NETHER) return this.genNether(chunk);
    if (dim === DIM.END) return this.genEnd(chunk);
    return this.genOverworld(chunk);
  }

  // ---- overworld ----
  genOverworld(chunk) {
    const bx = chunk.cx * CHUNK_SX, bz = chunk.cz * CHUNK_SZ;
    const set = (x, y, z, id) => { if (y >= 0 && y < WORLD_HEIGHT) chunk.blocks[x + z * CHUNK_SX + y * 256] = id; };

    for (let lz = 0; lz < CHUNK_SZ; lz++) {
      for (let lx = 0; lx < CHUNK_SX; lx++) {
        const wx = bx + lx, wz = bz + lz;
        const col = this.column(wx, wz);
        const sy = col.surfaceY;
        const b = col.biome;
        const soil = (b.top === BLOCK.SAND || b.top === BLOCK.RED_SAND) ? 4 : 4;
        const bedrockMax = (hash2(wx, wz, this.seed) * 3) | 0;

        for (let y = 0; y <= sy; y++) {
          let id = BLOCK.STONE;
          if (y <= bedrockMax) id = BLOCK.BEDROCK;
          else if (y > sy - soil) {
            id = (y === sy) ? b.top : b.sub;
            if (b.top === BLOCK.RED_SAND && y < sy) id = BLOCK.TERRACOTTA;
          }
          set(lx, y, lz, id);
        }
        // water / ice fill
        if (sy < SEA_LEVEL) {
          for (let y = sy + 1; y <= SEA_LEVEL; y++) set(lx, y, lz, BLOCK.WATER);
          if (b.waterTint === WATER_T.cold || col.temp < -0.4) set(lx, SEA_LEVEL, lz, BLOCK.ICE);
        }
        // caves
        for (let y = 2; y < sy; y++) {
          if (chunk.blocks[lx + lz * CHUNK_SX + y * 256] === BLOCK.BEDROCK) continue;
          const spaghetti = Math.abs(this.nCave.fbm3(wx * 0.018, y * 0.022, wz * 0.018, 2));
          const cheese = this.nCave2.simplex3(wx * 0.011, y * 0.016, wz * 0.011);
          if (spaghetti < 0.055 || cheese > 0.58) {
            set(lx, y, lz, y <= 9 ? BLOCK.LAVA : BLOCK.AIR);
          }
        }
        // ores
        for (let y = 1; y < sy; y++) {
          const i = lx + lz * CHUNK_SX + y * 256;
          if (chunk.blocks[i] !== BLOCK.STONE) continue;
          chunk.blocks[i] = this.oreAt(wx, y, wz, b);
        }
        // snow layer on cold surfaces
        if (b.snow && sy >= SEA_LEVEL && chunk.blocks[lx + lz * CHUNK_SX + sy * 256] !== BLOCK.WATER) {
          set(lx, sy + 1, lz, BLOCK.SNOW_LAYER);
        }
      }
    }
    this.decorate(chunk);
  }

  oreAt(wx, y, wz, biome) {
    const r = hash3(wx, y, wz, this.seed ^ 0x5bd1e995);
    if (y < 16 && r > 0.992) return BLOCK.DIAMOND_ORE;
    if (y < 32 && r > 0.990) return BLOCK.GOLD_ORE;
    if (y < 20 && r < 0.010) return BLOCK.REDSTONE_ORE;
    if (y < 32 && r > 0.978 && r < 0.984) return BLOCK.LAPIS_ORE;
    if (biome.mountainous && y > 50 && r > 0.995) return BLOCK.EMERALD_ORE;
    if (y < SEA_LEVEL + 8 && r > 0.955 && r < 0.972) return BLOCK.IRON_ORE;
    if (r > 0.92 && r < 0.95) return BLOCK.COAL_ORE;
    if (r > 0.90 && r < 0.905) return BLOCK.GRAVEL;
    if (r > 0.905 && r < 0.908 && y > 40) return BLOCK.DIRT;
    return BLOCK.STONE;
  }

  // decorations with cross-chunk margin so trees seam correctly
  decorate(chunk) {
    const bx = chunk.cx * CHUNK_SX, bz = chunk.cz * CHUNK_SZ;
    const M = 3;
    const setL = (wx, wy, wz, id, mode) => {
      const lx = wx - bx, lz = wz - bz;
      if (lx < 0 || lz < 0 || lx >= CHUNK_SX || lz >= CHUNK_SZ || wy < 0 || wy >= WORLD_HEIGHT) return;
      const i = lx + lz * CHUNK_SX + wy * 256;
      const cur = chunk.blocks[i];
      if (mode === 'leaf') { if (cur === BLOCK.AIR) chunk.blocks[i] = id; }
      else if (mode === 'log') { if (cur === BLOCK.AIR || cur === BLOCK.LEAVES_OAK || cur === BLOCK.GRASS) chunk.blocks[i] = id; }
      else chunk.blocks[i] = id;
    };

    // trees (origins from a margin region around the chunk)
    for (let oz = -M; oz < CHUNK_SZ + M; oz++) {
      for (let ox = -M; ox < CHUNK_SX + M; ox++) {
        const wx = bx + ox, wz = bz + oz;
        const col = this.column(wx, wz);
        const b = col.biome;
        if (b.tree === 'none' || !b.treeChance) continue;
        if (col.surfaceY < SEA_LEVEL) continue;
        if (hash3(wx, 7, wz, this.seed + 99) > b.treeChance) continue;
        this.stampTree(setL, wx, col.surfaceY + 1, wz, b, col);
      }
    }

    // ground plants only within this chunk
    for (let lz = 0; lz < CHUNK_SZ; lz++) {
      for (let lx = 0; lx < CHUNK_SX; lx++) {
        const wx = bx + lx, wz = bz + lz;
        const col = this.column(wx, wz);
        const b = col.biome;
        const sy = col.surfaceY;
        if (sy < SEA_LEVEL) continue;
        const topI = lx + lz * CHUNK_SX + sy * 256;
        const topId = chunk.blocks[topI];
        const aboveI = lx + lz * CHUNK_SX + (sy + 1) * 256;
        if (chunk.blocks[aboveI] !== BLOCK.AIR) continue;
        const r = hash3(wx, 31, wz, this.seed + 7);
        if (topId === BLOCK.GRASS || topId === BLOCK.GRASS_BLOCK_SNOW) {
          if (b.flowerChance && r < b.flowerChance) {
            chunk.blocks[aboveI] = (r < b.flowerChance * 0.5) ? BLOCK.FLOWER_POPPY : BLOCK.FLOWER_DANDELION;
          } else if (b.grassChance && r < b.grassChance + (b.flowerChance || 0)) {
            chunk.blocks[aboveI] = BLOCK.TALL_GRASS;
          } else if (b.mushroom && r > 0.97) {
            chunk.blocks[aboveI] = (r > 0.985) ? BLOCK.MUSHROOM_RED : BLOCK.MUSHROOM_BROWN;
          }
        } else if (topId === BLOCK.SAND && b.cactus && r < 0.03) {
          const h = 1 + ((hash3(wx, 5, wz, this.seed) * 3) | 0);
          for (let k = 0; k < h; k++) chunk.blocks[lx + lz * CHUNK_SX + (sy + 1 + k) * 256] = BLOCK.CACTUS;
        } else if (topId === BLOCK.SAND && b.deadbush && r > 0.96) {
          chunk.blocks[aboveI] = BLOCK.DEAD_BUSH;
        } else if (topId === BLOCK.RED_SAND && r > 0.97) {
          chunk.blocks[aboveI] = BLOCK.DEAD_BUSH;
        }
        // sugar cane near water
        if ((topId === BLOCK.GRASS || topId === BLOCK.SAND) && r > 0.93 && r < 0.96) {
          if (this.nearWater(wx, sy, wz)) {
            const h = 1 + ((hash3(wx, 11, wz, this.seed) * 3) | 0);
            for (let k = 0; k < h; k++) chunk.blocks[lx + lz * CHUNK_SX + (sy + 1 + k) * 256] = BLOCK.SUGAR_CANE;
          }
        }
      }
    }
  }

  nearWater(wx, sy, wz) {
    return this.column(wx + 1, wz).surfaceY < SEA_LEVEL || this.column(wx - 1, wz).surfaceY < SEA_LEVEL ||
           this.column(wx, wz + 1).surfaceY < SEA_LEVEL || this.column(wx, wz - 1).surfaceY < SEA_LEVEL;
  }

  stampTree(setL, wx, wy, wz, biome, col) {
    let type = biome.tree;
    if (type === 'oakbirch') type = (hash3(wx, 3, wz, this.seed) < 0.5) ? 'oak' : 'birch';
    let log = BLOCK.LOG_OAK, leaf = BLOCK.LEAVES_OAK, h = 4 + ((hash3(wx, 1, wz, this.seed) * 3) | 0);
    if (type === 'birch') { log = BLOCK.LOG_BIRCH; leaf = BLOCK.LEAVES_BIRCH; h = 5 + ((hash3(wx, 2, wz, this.seed) * 2) | 0); }
    else if (type === 'spruce') { log = BLOCK.LOG_SPRUCE; leaf = BLOCK.LEAVES_SPRUCE; h = 6 + ((hash3(wx, 2, wz, this.seed) * 4) | 0); }
    else if (type === 'jungle') { log = BLOCK.LOG_JUNGLE; leaf = BLOCK.LEAVES_JUNGLE; h = 7 + ((hash3(wx, 2, wz, this.seed) * 6) | 0); }

    if (type === 'spruce') {
      // conical
      for (let i = 0; i < h; i++) setL(wx, wy + i, wz, log, 'log');
      let radius = 2;
      for (let y = h - 1; y >= 2; y--) {
        const r = ((h - y) % 2 === 0) ? radius : radius - 1;
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
          if (Math.abs(dx) + Math.abs(dz) > r + 1) continue;
          if (dx === 0 && dz === 0 && y < h) continue;
          setL(wx + dx, wy + y, wz + dz, leaf, 'leaf');
        }
        if ((h - y) % 2 === 0) radius = Math.min(radius + 1, 3);
      }
      setL(wx, wy + h, wz, leaf, 'leaf');
    } else {
      for (let i = 0; i < h; i++) setL(wx, wy + i, wz, log, 'log');
      const top = wy + h;
      for (let dy = -2; dy <= 1; dy++) {
        const r = (dy >= 0) ? 1 : 2;
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
          if (Math.abs(dx) === r && Math.abs(dz) === r && hash3(wx + dx, dy, wz + dz, this.seed) < 0.5) continue;
          setL(wx + dx, top + dy, wz + dz, leaf, 'leaf');
        }
      }
    }
  }

  // ---- nether ----
  genNether(chunk) {
    const bx = chunk.cx * CHUNK_SX, bz = chunk.cz * CHUNK_SZ;
    const set = (x, y, z, id) => { chunk.blocks[x + z * CHUNK_SX + y * 256] = id; };
    for (let lz = 0; lz < CHUNK_SZ; lz++) for (let lx = 0; lx < CHUNK_SX; lx++) {
      const wx = bx + lx, wz = bz + lz;
      for (let y = 0; y < 122; y++) {
        if (y <= 3) { set(lx, y, lz, BLOCK.BEDROCK); continue; }
        const n = this.nNether.fbm3(wx * 0.03, y * 0.045, wz * 0.03, 3);
        const open = n > 0.0 + (y > 60 ? (y - 60) * 0.006 : 0) - (y < 30 ? (30 - y) * 0.01 : 0);
        if (open && (y > 40 || n > 0.18)) {
          set(lx, y, lz, y <= 31 ? BLOCK.LAVA : BLOCK.AIR);
        } else {
          let id = BLOCK.NETHERRACK;
          const r = hash3(wx, y, wz, this.seed + 3);
          if (y < 34 && r > 0.985) id = BLOCK.SOUL_SAND;
          set(lx, y, lz, id);
        }
      }
      for (let y = 120; y < WORLD_HEIGHT; y++) set(lx, y, lz, BLOCK.BEDROCK);
      // glowstone on ceilings
      for (let y = 40; y < 118; y++) {
        const i = lx + lz * CHUNK_SX + y * 256;
        if (chunk.blocks[i] === BLOCK.NETHERRACK && chunk.blocks[i - 256] === BLOCK.AIR && hash3(wx, y, wz, this.seed + 4) > 0.992) {
          set(lx, y, lz, BLOCK.GLOWSTONE);
        }
      }
    }
  }

  // ---- end ----
  genEnd(chunk) {
    const bx = chunk.cx * CHUNK_SX, bz = chunk.cz * CHUNK_SZ;
    const set = (x, y, z, id) => { chunk.blocks[x + z * CHUNK_SX + y * 256] = id; };
    for (let lz = 0; lz < CHUNK_SZ; lz++) for (let lx = 0; lx < CHUNK_SX; lx++) {
      const wx = bx + lx, wz = bz + lz;
      const dist = Math.sqrt(wx * wx + wz * wz);
      const island = this.nEnd.fbm2(wx * 0.01, wz * 0.01, 4);
      const falloff = smoothstep(360, 80, dist); // 1 near center, 0 far
      const dense = island * 0.5 + 0.5 + falloff * 0.6 - 0.55;
      if (dist < 70 || dense > 0.15) {
        const thick = Math.floor(6 + (island + 1) * 8 + falloff * 6);
        const cy = 56;
        for (let y = cy - thick; y <= cy; y++) if (y >= 0) set(lx, y, lz, BLOCK.END_STONE);
      }
    }
    // central obsidian spawn platform
    if (chunk.cx === 0 && chunk.cz === 0) {
      for (let y = 56; y <= 56; y++) for (let x = 5; x <= 9; x++) for (let z = 5; z <= 9; z++) set(x, y, z, BLOCK.OBSIDIAN);
    }
  }

  spawnHeight(wx, wz, dim) {
    if (dim === DIM.END) return 58;
    if (dim === DIM.NETHER) return 64;
    const c = this.column(wx, wz);
    return Math.max(c.surfaceY + 1, SEA_LEVEL + 1);
  }
}
