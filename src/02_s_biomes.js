/* =========================================================================
 * BIOMES — climate table, surface rules, colour grading and spawn sets.
 * Shared with the terrain worker.
 * ========================================================================= */

var BIOMES = [];
var BIOME_ID = {};

function defBiome(name, o) {
  var b = {
    id: BIOMES.length, name: name, disp: o.disp || titleCase(name),
    top: o.top || 'grass_block',
    filler: o.filler || 'dirt',
    under: o.under || 'stone',
    seafloor: o.seafloor || 'gravel',
    grass: o.grass || '#79c05a',
    foliage: o.foliage || '#59ae30',
    water: o.water || '#3f76e4',
    waterFog: o.waterFog || '#050533',
    fog: o.fog || '#c0d8ff',
    sky: o.sky || '#78a7ff',
    temp: o.temp === undefined ? 0.7 : o.temp,
    downfall: o.downfall === undefined ? 0.5 : o.downfall,
    snow: o.snow || false,
    dim: o.dim === undefined ? DIM_OVERWORLD : o.dim,
    trees: o.trees || null,          // [{type, w}] weighted list
    treeChance: o.treeChance || 0,   // trees per chunk (float)
    grassDensity: o.grassDensity === undefined ? 0.25 : o.grassDensity,
    grassBlock: o.grassBlock || 'short_grass',
    flowers: o.flowers || null,
    flowerChance: o.flowerChance || 0.02,
    features: o.features || null,    // extra decorators
    spawns: o.spawns || null,
    ambient: o.ambient || null,
    music: o.music || null,
    heightBias: o.heightBias || 0,
    beach: o.beach || null
  };
  BIOMES.push(b);
  BIOME_ID[name] = b.id;
  return b;
}

/* ------------------------------------------------------------- oceans -- */
defBiome('ocean', { top: 'gravel', filler: 'gravel', seafloor: 'gravel', temp: 0.5, grassDensity: 0, spawns: ['cod', 'squid', 'dolphin', 'drowned'] });
defBiome('deep_ocean', { top: 'gravel', filler: 'gravel', temp: 0.5, grassDensity: 0, water: '#3554a8', spawns: ['cod', 'squid', 'glow_squid', 'drowned'] });
defBiome('warm_ocean', { top: 'sand', filler: 'sand', seafloor: 'sand', temp: 0.9, water: '#43d5ee', waterFog: '#041f33', grassDensity: 0, spawns: ['tropical_fish', 'pufferfish', 'squid', 'dolphin'] });
defBiome('lukewarm_ocean', { top: 'sand', filler: 'sand', temp: 0.8, water: '#45adf2', grassDensity: 0, spawns: ['cod', 'tropical_fish', 'squid', 'dolphin'] });
defBiome('cold_ocean', { top: 'gravel', filler: 'gravel', temp: 0.3, water: '#3d57d6', grassDensity: 0, spawns: ['cod', 'salmon', 'squid', 'drowned'] });
defBiome('frozen_ocean', { top: 'gravel', filler: 'gravel', temp: 0.0, snow: true, water: '#3938c9', fog: '#d8e8ff', grassDensity: 0, spawns: ['salmon', 'squid', 'polar_bear', 'drowned'] });
defBiome('deep_frozen_ocean', { top: 'gravel', filler: 'gravel', temp: 0.0, snow: true, water: '#3434b0', grassDensity: 0, spawns: ['salmon', 'squid', 'polar_bear', 'drowned'] });
defBiome('river', { top: 'sand', filler: 'sand', seafloor: 'sand', temp: 0.5, grassDensity: 0, water: '#3f76e4', spawns: ['salmon', 'squid'] });
defBiome('frozen_river', { top: 'sand', filler: 'sand', temp: 0.0, snow: true, grassDensity: 0, water: '#3938c9', spawns: ['salmon', 'squid'] });
defBiome('beach', { top: 'sand', filler: 'sand', under: 'sandstone', temp: 0.8, grassDensity: 0, spawns: ['turtle'] });
defBiome('snowy_beach', { top: 'sand', filler: 'sand', temp: 0.05, snow: true, grassDensity: 0, fog: '#dae6ff' });
defBiome('stony_shore', { top: 'stone', filler: 'stone', temp: 0.2, grassDensity: 0 });

/* ------------------------------------------------------------- plains -- */
defBiome('plains', {
  temp: 0.8, downfall: 0.4, grass: '#8fbf62', foliage: '#69ae30', treeChance: 0.12,
  trees: [['oak', 8], ['birch', 1]], grassDensity: 0.42, flowerChance: 0.05,
  flowers: ['dandelion', 'poppy', 'azure_bluet', 'oxeye_daisy', 'cornflower'],
  spawns: ['cow', 'sheep', 'pig', 'chicken', 'horse', 'donkey', 'rabbit']
});
defBiome('sunflower_plains', {
  temp: 0.8, grass: '#93c162', treeChance: 0.1, trees: [['oak', 1]], grassDensity: 0.42,
  flowerChance: 0.22, flowers: ['sunflower', 'dandelion', 'poppy'],
  spawns: ['cow', 'sheep', 'pig', 'chicken', 'horse', 'rabbit']
});
defBiome('meadow', {
  temp: 0.5, grass: '#83bb6d', foliage: '#63a948', treeChance: 0.04, trees: [['oak', 3], ['birch', 1]],
  grassDensity: 0.55, flowerChance: 0.2,
  flowers: ['dandelion', 'poppy', 'azure_bluet', 'cornflower', 'oxeye_daisy', 'allium'],
  spawns: ['sheep', 'donkey', 'rabbit', 'bee']
});
defBiome('cherry_grove', {
  temp: 0.5, grass: '#b6db61', foliage: '#b6db61', treeChance: 0.5, trees: [['cherry', 1]],
  grassDensity: 0.5, flowerChance: 0.25, flowers: ['pink_petals', 'allium', 'pink_tulip'],
  fog: '#f0d8e8', spawns: ['sheep', 'pig', 'rabbit', 'bee']
});

/* ------------------------------------------------------------ forests -- */
defBiome('forest', {
  temp: 0.7, downfall: 0.8, grass: '#79c05a', foliage: '#59ae30', treeChance: 4.2,
  trees: [['oak', 5], ['birch', 2], ['oak_big', 1]], grassDensity: 0.32, flowerChance: 0.05,
  flowers: ['poppy', 'dandelion', 'lily_of_the_valley'],
  spawns: ['wolf', 'cow', 'sheep', 'pig', 'chicken', 'rabbit', 'fox']
});
defBiome('flower_forest', {
  temp: 0.7, grass: '#79c05a', treeChance: 2.4, trees: [['oak', 3], ['birch', 1]],
  grassDensity: 0.28, flowerChance: 0.45,
  flowers: ['poppy', 'dandelion', 'allium', 'azure_bluet', 'red_tulip', 'orange_tulip', 'white_tulip', 'pink_tulip', 'oxeye_daisy', 'cornflower', 'lily_of_the_valley', 'rose_bush', 'peony', 'lilac'],
  spawns: ['rabbit', 'bee', 'cow', 'sheep']
});
defBiome('birch_forest', {
  temp: 0.6, grass: '#88bb67', foliage: '#6ba941', treeChance: 4.0, trees: [['birch', 1]],
  grassDensity: 0.3, flowerChance: 0.06, flowers: ['lily_of_the_valley', 'dandelion'],
  spawns: ['cow', 'sheep', 'pig', 'bee']
});
defBiome('old_growth_birch_forest', {
  temp: 0.6, grass: '#88bb67', treeChance: 4.5, trees: [['birch_tall', 3], ['birch', 1]],
  grassDensity: 0.3, spawns: ['cow', 'sheep', 'bee']
});
defBiome('dark_forest', {
  temp: 0.7, grass: '#507a32', foliage: '#3f6b28', treeChance: 6.5,
  trees: [['dark_oak', 6], ['oak', 2], ['mushroom_huge', 1]], grassDensity: 0.22,
  flowerChance: 0.03, flowers: ['lilac', 'rose_bush', 'peony'], fog: '#9fb0c0',
  spawns: ['wolf', 'cow', 'sheep', 'chicken']
});
defBiome('pale_garden', {
  temp: 0.7, grass: '#778c76', foliage: '#78896f', treeChance: 4.5,
  trees: [['pale_oak', 1]], grassDensity: 0.3, fog: '#8f9a96', sky: '#7d8a94',
  spawns: ['creaking']
});
defBiome('taiga', {
  temp: 0.25, downfall: 0.8, grass: '#68a464', foliage: '#4f8a4a', treeChance: 4.0,
  trees: [['spruce', 8], ['spruce_tall', 2]], grassDensity: 0.3, flowerChance: 0.02,
  flowers: ['dandelion', 'poppy'], features: ['sweet_berry', 'fern'],
  spawns: ['wolf', 'rabbit', 'fox', 'cow', 'sheep', 'pig']
});
defBiome('snowy_taiga', {
  temp: 0.0, snow: true, grass: '#5f9668', foliage: '#4a7a55', treeChance: 3.4,
  trees: [['spruce', 1]], grassDensity: 0.2, fog: '#cfe0f5', features: ['fern'],
  spawns: ['wolf', 'rabbit', 'fox']
});
defBiome('old_growth_pine_taiga', {
  temp: 0.3, grass: '#68a464', treeChance: 5.5, trees: [['pine_mega', 4], ['spruce', 2]],
  grassDensity: 0.35, features: ['podzol', 'mushrooms', 'fern'],
  spawns: ['wolf', 'rabbit', 'fox', 'llama']
});
defBiome('old_growth_spruce_taiga', {
  temp: 0.25, grass: '#68a464', treeChance: 6.0, trees: [['spruce_mega', 4], ['spruce', 2]],
  grassDensity: 0.4, features: ['podzol', 'mushrooms', 'fern'],
  spawns: ['wolf', 'rabbit', 'fox']
});
defBiome('grove', {
  temp: 0.0, snow: true, top: 'snow_block', filler: 'dirt', grass: '#80b497', treeChance: 3.0,
  trees: [['spruce', 1]], grassDensity: 0.1, fog: '#d8e6f5',
  spawns: ['wolf', 'rabbit', 'fox']
});

/* -------------------------------------------------------------- humid -- */
defBiome('jungle', {
  temp: 0.95, downfall: 0.9, grass: '#59c93c', foliage: '#30bb0b', treeChance: 7.0,
  trees: [['jungle_big', 3], ['jungle', 6], ['jungle_bush', 4]], grassDensity: 0.55,
  features: ['vines', 'melon', 'cocoa'], flowerChance: 0.02, fog: '#a8dfa8',
  spawns: ['parrot', 'ocelot', 'panda', 'chicken', 'pig', 'cow']
});
defBiome('sparse_jungle', {
  temp: 0.95, grass: '#64c73f', foliage: '#3bc21a', treeChance: 1.4,
  trees: [['jungle', 3], ['jungle_bush', 2]], grassDensity: 0.45, features: ['vines'],
  spawns: ['parrot', 'ocelot', 'chicken', 'pig']
});
defBiome('bamboo_jungle', {
  temp: 0.95, grass: '#59c93c', treeChance: 1.2, trees: [['jungle', 1]], grassDensity: 0.3,
  features: ['bamboo', 'vines'], spawns: ['panda', 'parrot', 'ocelot']
});
defBiome('swamp', {
  temp: 0.8, downfall: 0.9, top: 'grass_block', grass: '#6a7039', foliage: '#6a7039',
  water: '#617b64', waterFog: '#232e1e', treeChance: 1.6, trees: [['swamp_oak', 1]],
  grassDensity: 0.3, features: ['lily_pad', 'vines', 'clay', 'mushrooms'], fog: '#9aa88a',
  heightBias: -4, spawns: ['slime', 'frog', 'chicken', 'sheep']
});
defBiome('mangrove_swamp', {
  temp: 0.8, top: 'grass_block', grass: '#6a7039', foliage: '#8db127', water: '#3a7a60',
  treeChance: 3.0, trees: [['mangrove', 1]], grassDensity: 0.2,
  features: ['lily_pad', 'mud', 'vines'], heightBias: -3, fog: '#8fa08a',
  spawns: ['frog', 'tropical_fish']
});
defBiome('mushroom_fields', {
  top: 'mycelium', filler: 'dirt', temp: 0.9, grass: '#55c93f', treeChance: 1.6,
  trees: [['mushroom_huge_red', 1], ['mushroom_huge_brown', 1]], grassDensity: 0.05,
  features: ['mushrooms_dense'], fog: '#c8b8d8', spawns: ['mooshroom']
});

/* --------------------------------------------------------------- arid -- */
defBiome('desert', {
  top: 'sand', filler: 'sand', under: 'sandstone', temp: 2.0, downfall: 0.0,
  grass: '#bfb755', foliage: '#aea42a', treeChance: 0.0, grassDensity: 0.02,
  grassBlock: 'dead_bush', features: ['cactus', 'sugar_cane', 'dead_bush'],
  fog: '#e8d8a8', sky: '#87b4ff', spawns: ['rabbit', 'husk']
});
defBiome('savanna', {
  temp: 1.2, downfall: 0.0, grass: '#bfb755', foliage: '#aea42a', treeChance: 0.9,
  trees: [['acacia', 1]], grassDensity: 0.6, fog: '#d8d0a0',
  spawns: ['horse', 'donkey', 'cow', 'sheep', 'llama']
});
defBiome('savanna_plateau', {
  temp: 1.1, grass: '#bfb755', treeChance: 0.6, trees: [['acacia', 1]], grassDensity: 0.5,
  spawns: ['horse', 'llama', 'cow', 'sheep']
});
defBiome('windswept_savanna', {
  temp: 1.1, grass: '#bfb755', treeChance: 0.2, trees: [['acacia', 1]], grassDensity: 0.35,
  spawns: ['horse', 'llama']
});
defBiome('badlands', {
  top: 'red_sand', filler: 'terracotta', under: 'terracotta', temp: 2.0, downfall: 0.0,
  grass: '#90814d', foliage: '#9e814d', treeChance: 0.0, grassDensity: 0.0,
  features: ['badlands_bands', 'dead_bush', 'cactus'], fog: '#e0b088',
  spawns: ['husk']
});
defBiome('eroded_badlands', {
  top: 'red_sand', filler: 'terracotta', under: 'terracotta', temp: 2.0,
  grass: '#90814d', grassDensity: 0.0, features: ['badlands_bands', 'dead_bush'], fog: '#e0b088'
});
defBiome('wooded_badlands', {
  top: 'coarse_dirt', filler: 'terracotta', under: 'terracotta', temp: 2.0,
  grass: '#90814d', treeChance: 2.2, trees: [['oak', 1]], grassDensity: 0.1,
  features: ['badlands_bands'], fog: '#dcb090'
});

/* --------------------------------------------------------------- cold -- */
defBiome('snowy_plains', {
  top: 'snow_block', filler: 'dirt', temp: 0.0, snow: true, grass: '#80b497',
  treeChance: 0.02, trees: [['spruce', 1]], grassDensity: 0.05, fog: '#dae6ff',
  spawns: ['rabbit', 'polar_bear', 'stray']
});
defBiome('ice_spikes', {
  top: 'snow_block', filler: 'dirt', temp: 0.0, snow: true, grass: '#80b497',
  grassDensity: 0.0, features: ['ice_spikes'], fog: '#e0eeff', spawns: ['stray', 'rabbit']
});
defBiome('snowy_slopes', {
  top: 'snow_block', filler: 'dirt', temp: 0.0, snow: true, grassDensity: 0.0,
  features: ['powder_snow'], fog: '#dfeaff', spawns: ['goat', 'rabbit']
});
defBiome('jagged_peaks', {
  top: 'snow_block', filler: 'stone', under: 'stone', temp: -0.7, snow: true,
  grassDensity: 0.0, fog: '#e8f0ff', spawns: ['goat']
});
defBiome('frozen_peaks', {
  top: 'packed_ice', filler: 'packed_ice', under: 'stone', temp: -0.7, snow: true,
  grassDensity: 0.0, fog: '#e8f4ff', spawns: ['goat']
});
defBiome('stony_peaks', {
  top: 'stone', filler: 'stone', under: 'stone', temp: 1.0, grassDensity: 0.0,
  features: ['calcite_veins'], fog: '#cddcf0'
});
defBiome('windswept_hills', {
  temp: 0.2, grass: '#8ab689', treeChance: 0.6, trees: [['spruce', 2], ['oak', 1]],
  grassDensity: 0.2, features: ['exposed_stone', 'emerald'], spawns: ['llama', 'sheep', 'goat']
});
defBiome('windswept_gravelly_hills', {
  top: 'gravel', filler: 'gravel', temp: 0.2, grass: '#8ab689', treeChance: 0.3,
  trees: [['spruce', 1]], grassDensity: 0.1, features: ['exposed_stone'], spawns: ['llama', 'goat']
});
defBiome('windswept_forest', {
  temp: 0.2, grass: '#8ab689', treeChance: 3.0, trees: [['spruce', 2], ['oak', 2]],
  grassDensity: 0.25, features: ['exposed_stone'], spawns: ['llama', 'wolf', 'sheep']
});

/* --------------------------------------------------------- cave biomes -- */
defBiome('lush_caves', {
  top: 'moss_block', filler: 'moss_block', temp: 0.7, grass: '#6fbf3a', foliage: '#5fae2a',
  grassDensity: 0.0, fog: '#3f6a3a', spawns: ['axolotl', 'tropical_fish', 'glow_squid']
});
defBiome('dripstone_caves', {
  top: 'dripstone_block', filler: 'dripstone_block', temp: 0.6, grassDensity: 0.0, fog: '#4a3a30'
});
defBiome('deep_dark', {
  top: 'deepslate', filler: 'deepslate', temp: 0.5, grassDensity: 0.0, fog: '#0a1216',
  sky: '#050a0c', spawns: ['warden']
});

/* ------------------------------------------------------------- nether -- */
defBiome('nether_wastes', {
  dim: DIM_NETHER, top: 'netherrack', filler: 'netherrack', under: 'netherrack',
  temp: 2.0, grassDensity: 0, fog: '#330707', sky: '#330707', water: '#905957',
  spawns: ['zombified_piglin', 'ghast', 'magma_cube', 'piglin', 'skeleton_wither', 'strider']
});
defBiome('crimson_forest', {
  dim: DIM_NETHER, top: 'crimson_nylium', filler: 'netherrack', under: 'netherrack',
  temp: 2.0, grassDensity: 0, treeChance: 6.0, trees: [['crimson_fungus_huge', 1]],
  fog: '#4a1119', sky: '#4a1119', spawns: ['hoglin', 'piglin', 'zombified_piglin', 'strider']
});
defBiome('warped_forest', {
  dim: DIM_NETHER, top: 'warped_nylium', filler: 'netherrack', under: 'netherrack',
  temp: 2.0, grassDensity: 0, treeChance: 6.0, trees: [['warped_fungus_huge', 1]],
  fog: '#1a5148', sky: '#1a5148', spawns: ['enderman', 'strider']
});
defBiome('soul_sand_valley', {
  dim: DIM_NETHER, top: 'soul_sand', filler: 'soul_soil', under: 'netherrack',
  temp: 2.0, grassDensity: 0, fog: '#1b4745', sky: '#1b4745',
  features: ['bone_pillars', 'soul_fire'], spawns: ['skeleton', 'ghast', 'enderman', 'skeleton_wither']
});
defBiome('basalt_deltas', {
  dim: DIM_NETHER, top: 'basalt', filler: 'blackstone', under: 'blackstone',
  temp: 2.0, grassDensity: 0, fog: '#685f70', sky: '#685f70',
  features: ['basalt_columns'], spawns: ['magma_cube', 'ghast', 'strider']
});

/* ---------------------------------------------------------------- end -- */
defBiome('the_end', {
  dim: DIM_END, top: 'end_stone', filler: 'end_stone', under: 'end_stone',
  temp: 0.5, grassDensity: 0, fog: '#0a0512', sky: '#0a0512', spawns: ['enderman']
});
defBiome('end_highlands', {
  dim: DIM_END, top: 'end_stone', filler: 'end_stone', under: 'end_stone',
  temp: 0.5, grassDensity: 0, fog: '#0a0512', sky: '#0a0512',
  features: ['chorus'], spawns: ['enderman', 'shulker']
});
defBiome('end_midlands', {
  dim: DIM_END, top: 'end_stone', filler: 'end_stone', under: 'end_stone',
  temp: 0.5, grassDensity: 0, fog: '#0a0512', sky: '#0a0512', spawns: ['enderman']
});
defBiome('small_end_islands', {
  dim: DIM_END, top: 'end_stone', filler: 'end_stone', under: 'end_stone',
  temp: 0.5, grassDensity: 0, fog: '#0a0512', sky: '#0a0512', spawns: ['enderman']
});
defBiome('end_barrens', {
  dim: DIM_END, top: 'end_stone', filler: 'end_stone', under: 'end_stone',
  temp: 0.5, grassDensity: 0, fog: '#0a0512', sky: '#0a0512', spawns: ['enderman']
});

/* Resolve the biome surface block names to ids once, at load. */
function resolveBiomeBlocks() {
  for (var i = 0; i < BIOMES.length; i++) {
    var b = BIOMES[i];
    b.topId = BID[b.top] !== undefined ? BID[b.top] : BID.grass_block;
    b.fillerId = BID[b.filler] !== undefined ? BID[b.filler] : BID.dirt;
    b.underId = BID[b.under] !== undefined ? BID[b.under] : BID.stone;
    b.seafloorId = BID[b.seafloor] !== undefined ? BID[b.seafloor] : BID.gravel;
  }
}
resolveBiomeBlocks();
